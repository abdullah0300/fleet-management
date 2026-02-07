import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0"

serve(async (req) => {
    // 1. Setup CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        })
    }

    try {
        const { pin } = await req.json()

        if (!pin) {
            return new Response(JSON.stringify({ error: 'PIN is required' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400
            })
        }

        // Create a Supabase client with the Admin Key (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Verify PIN in your 'drivers' table AND get the linked profile/email
        const { data: driver, error: driverError } = await supabaseAdmin
            .from('drivers')
            .select(`
                *,
                profiles (
                    email,
                    full_name
                )
            `)
            .eq('login_pin', pin)
            .single()

        if (driverError || !driver) {
            return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        const realEmail = driver.profiles?.email

        if (!realEmail) {
            return new Response(JSON.stringify({ error: 'Driver profile has no email. Contact Dispatch.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 2. Authenticate the user with REAL EMAIL and PIN (as password)
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
            email: realEmail,
            password: pin + 'fleet'
        })

        if (sessionError) {
            // Optional: Auto-provisioning could go here if we wanted to be fancy,
            // but for safety, we return error.
            return new Response(JSON.stringify({ error: 'Driver account setup incomplete. Contact Dispatch to sync PIN.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        return new Response(JSON.stringify({
            session: sessionData.session,
            user: sessionData.user,
            driver: driver // Return enriched driver profile for the app to use
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
