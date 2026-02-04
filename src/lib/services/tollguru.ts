'use server'

const TOLLGURU_API_KEY = process.env.TOLLGURU_API_KEY
const TOLLGURU_API_URL = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints'

export interface TollCalculationResult {
    tollCost: number
    currency: string
    duration: number // minutes
    distance: number // km
    routes: any[]
}

/**
 * Calculate tolls between origin and destination using TollGuru API
 */
export async function calculateTolls(origin: string, destination: string, vehicleType: string = '2AxlesAuto'): Promise<TollCalculationResult | null> {
    if (!TOLLGURU_API_KEY) {
        console.error('TollGuru API key is missing')
        throw new Error('TollGuru API key is not configured')
    }

    try {
        const response = await fetch(TOLLGURU_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': TOLLGURU_API_KEY
            },
            body: JSON.stringify({
                from: { address: origin },
                to: { address: destination },
                vehicle: { type: vehicleType },
                serviceProvider: "here",
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('TollGuru API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            })
            // Return null instead of throwing to prevent app crash, let UI handle it
            return null
        }

        const data = await response.json()

        // Extract relevant data from response
        // TollGuru returns a list of routes. We usually take the first/fastest one.
        const route = data.routes?.[0]

        if (!route) return null

        return {
            tollCost: route.costs?.tag || route.costs?.cash || 0,
            currency: route.costs?.currency || 'USD',
            duration: (route.summary?.duration?.value || 0) / 60, // Convert to minutes
            distance: (route.summary?.distance?.value || 0) / 1609.34, // Convert meters to miles
            routes: data.routes
        }

    } catch (error) {
        console.error('Error calculating tolls:', error)
        throw error
    }
}
