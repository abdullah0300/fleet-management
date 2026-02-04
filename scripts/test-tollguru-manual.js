
const TOLLGURU_API_KEY = 'tg_B7E49ACA3303494790D14578FA44842E'
const TOLLGURU_API_URL = 'https://apis.tollguru.com/toll/v2/origin-destination-waypoints'

async function testTolls() {
    console.log('Testing TollGuru API...')

    try {
        const response = await fetch(TOLLGURU_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': TOLLGURU_API_KEY
            },
            body: JSON.stringify({
                from: { address: 'Manhattan, Kansas, United States' },
                to: { address: 'Brooklyn Park, Minnesota, United States' },
                vehicle: { type: '2AxlesAuto' },
                serviceProvider: "here"
            })
        })

        console.log('Status:', response.status)

        const text = await response.text()
        console.log('Response:', text.substring(0, 500))

        if (!response.ok) {
            console.error('API Call Failed')
        } else {
            const data = JSON.parse(text)
            console.log('Routes found:', data.routes?.length)
            if (data.routes?.length > 0) {
                console.log('First route summary:', data.routes[0].summary)
                console.log('First route costs:', data.routes[0].costs)
            }
        }

    } catch (error) {
        console.error('Test failed:', error)
    }
}

testTolls()
