import { TmsIntegration } from './types'

const INTEGRATIONS: TmsIntegration[] = [
    {
        slug: 'cargomatic',
        name: 'Cargomatic',
        description: 'Receive load tenders, accept shipments, manage stops, and upload PODs directly from Cargomatic\'s TMS.',
        logoText: 'CM',
        logoUrl: 'https://cargomaticprod.wpenginepowered.com/wp-content/uploads/2021/01/logo-footer.svg',
        category: 'freight_broker',
        status: 'available',
        authFields: [
            { name: 'username', label: 'Username', type: 'text' },
            { name: 'password', label: 'Password', type: 'password' },
        ],
    },
    {
        slug: 'dat',
        name: 'DAT',
        description: 'Access the largest truckload freight marketplace and find loads matching your lanes.',
        logoText: 'DAT',
        logoUrl: 'https://www.google.com/s2/favicons?domain=dat.com&sz=128',
        category: 'load_board',
        status: 'coming_soon',
        authFields: [],
    },
    {
        slug: '123loadboard',
        name: '123Loadboard',
        description: 'Search loads, post trucks, and manage your freight with 123Loadboard integration.',
        logoText: '123',
        logoUrl: 'https://www.google.com/s2/favicons?domain=123loadboard.com&sz=128',
        category: 'load_board',
        status: 'coming_soon',
        authFields: [],
    },
    {
        slug: 'truckstop',
        name: 'Truckstop',
        description: 'Connect to Truckstop.com for load matching, rate tools, and carrier tools.',
        logoText: 'TS',
        logoUrl: 'https://www.google.com/s2/favicons?domain=truckstop.com&sz=128',
        category: 'load_board',
        status: 'coming_soon',
        authFields: [],
    },
    {
        slug: 'convoy',
        name: 'Convoy',
        description: 'Digital freight network with automated matching and pricing for carriers.',
        logoText: 'CV',
        logoUrl: 'https://www.google.com/s2/favicons?domain=convoy.com&sz=128',
        category: 'freight_broker',
        status: 'coming_soon',
        authFields: [],
    },
]

export function getAllIntegrations(): TmsIntegration[] {
    return INTEGRATIONS
}

export function getIntegration(slug: string): TmsIntegration | undefined {
    return INTEGRATIONS.find(i => i.slug === slug)
}

export function getAvailableIntegrations(): TmsIntegration[] {
    return INTEGRATIONS.filter(i => i.status === 'available')
}

export function getComingSoonIntegrations(): TmsIntegration[] {
    return INTEGRATIONS.filter(i => i.status === 'coming_soon')
}
