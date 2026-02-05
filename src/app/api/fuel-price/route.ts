import { NextResponse } from 'next/server'

const EIA_API_KEY = process.env.EIA_API_KEY
const BASE_URL = 'https://api.eia.gov/v2/petroleum/pri/gnd/data/'

export async function GET() {
    if (!EIA_API_KEY) {
        return NextResponse.json(
            { error: 'EIA API key not configured' },
            { status: 500 }
        )
    }

    try {
        // Fetch On-Highway Diesel Fuel (National Average)
        // Series ID: PET.EMD_EPD2D_FTE_NUS_DPG.W is implicitly filtered by these facets
        const params = new URLSearchParams({
            'frequency': 'weekly',
            'data[0]': 'value',
            'facets[product][]': 'EPD2D', // EPD2D = No 2 Diesel
            'facets[process][]': 'PTE',   // PTE = Retail Sales
            'facets[duoarea][]': 'NUS',   // NUS = National US
            'sort[0][column]': 'period',
            'sort[0][direction]': 'desc',
            'offset': '0',
            'length': '1',
            'api_key': EIA_API_KEY
        })

        const response = await fetch(`${BASE_URL}?${params.toString()}`, {
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('EIA API Error:', errorText)
            throw new Error(`EIA API responded with ${response.status}`)
        }

        const data = await response.json()

        if (!data.response?.data?.[0]) {
            throw new Error('No data received from EIA API')
        }

        const latest = data.response.data[0]

        return NextResponse.json({
            price: parseFloat(latest.value),
            date: latest.period,
            unit: '$/gal'
        })

    } catch (error) {
        console.error('Failed to fetch fuel price:', error)
        return NextResponse.json(
            { error: 'Failed to fetch fuel price' },
            { status: 500 }
        )
    }
}
