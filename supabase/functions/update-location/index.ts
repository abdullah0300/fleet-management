import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        console.log("Update Location Function Invoked")

        // Debug Env Vars
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        if (!supabaseUrl) console.error("Missing SUPABASE_URL")
        if (!serviceRoleKey) console.error("Missing SUPABASE_SERVICE_ROLE_KEY")

        // Client for Auth Verification (User Context)
        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Client for DB Operations (Admin Context - Bypass RLS)
        const supabaseAdmin = createClient(
            supabaseUrl,
            serviceRoleKey
        )

        // 1. Get the user from the authorization header (JWT)
        const authHeader = req.headers.get('Authorization')
        console.log("Auth Header present:", !!authHeader)

        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser()

        if (userError || !user) {
            console.error("Auth Error:", userError)
            return new Response(
                JSON.stringify({ error: 'Unauthorized', details: userError }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log("User Authenticated:", user.id)

        // 2. Parse the request body
        const { lat, lng, heading, speed, timestamp } = await req.json()

        if (!lat || !lng) {
            return new Response(
                JSON.stringify({ error: 'Missing latitude/longitude' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Find the vehicle assigned to this user (Driver)
        // Use Admin Client to bypass RLS
        const { data: vehicleData, error: vehicleError } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('current_driver_id', user.id)
            .maybeSingle()

        if (vehicleError || !vehicleData) {
            console.error("Vehicle Lookup Error:", vehicleError)
            return new Response(
                JSON.stringify({ error: 'No vehicle assigned to this driver' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const vehicleId = vehicleData.id

        // 4. Update the vehicle's location and add to history
        const locationData = {
            lat,
            lng,
            heading: heading || 0,
            speed: speed || 0,
            timestamp: timestamp || new Date().toISOString(),
            last_updated: new Date().toISOString()
        }

        // Parallel update: Update current location + Insert history
        // Using Promise.allSettled to ensure transient history insert failures don't block the critical location update response
        // However, Promise.all is usually fine if we handle errors inside. Here we use Promise.all to conform to the user's robust approach.

        const [updateResult, insertHistoryResult] = await Promise.all([
            // Update current location (Critical)
            supabaseAdmin
                .from('vehicles')
                .update({ current_location: locationData })
                .eq('id', vehicleId),

            // Insert into history (Non-critical but important for POD)
            supabaseAdmin
                .from('vehicle_location_history')
                .insert({
                    vehicle_id: vehicleId,
                    driver_id: user.id,
                    lat,
                    lng,
                    heading: heading || 0,
                    speed: speed || 0,
                    timestamp: timestamp || new Date().toISOString()
                })
        ])

        if (updateResult.error) {
            console.error("Update Error:", updateResult.error)
            throw updateResult.error
        }

        if (insertHistoryResult.error) {
            console.error('Error saving history (non-fatal):', insertHistoryResult.error)
            // We log but don't fail the request, as real-time tracking is primary
        }

        return new Response(
            JSON.stringify({ success: true, vehicle_id: vehicleId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("Unhandled Error:", error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
