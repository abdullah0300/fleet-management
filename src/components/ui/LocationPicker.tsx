'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps'

interface LocationResult {
    id: string
    place_name: string
}

interface LocationPickerProps {
    value: string
    onChange: (value: string, coordinates?: { lat: number; lng: number }) => void
    placeholder?: string
    className?: string
    error?: string
    disabled?: boolean
}

function InnerLocationPicker({
    value,
    onChange,
    placeholder = 'Search for a location...',
    className,
    error,
    disabled = false,
}: LocationPickerProps) {
    const [query, setQuery] = useState(value)
    const [results, setResults] = useState<LocationResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    const placesLib = useMapsLibrary('places')
    const geocodingLib = useMapsLibrary('geocoding')

    const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null)
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null)

    useEffect(() => {
        if (!placesLib) return
        setAutocompleteService(new placesLib.AutocompleteService())
    }, [placesLib])

    useEffect(() => {
        if (!geocodingLib) return
        setGeocoder(new geocodingLib.Geocoder())
    }, [geocodingLib])

    // Sync external value changes
    useEffect(() => {
        setQuery(value)
    }, [value])

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const searchLocations = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 3 || !autocompleteService) {
            setResults([])
            return
        }

        setIsLoading(true)
        try {
            const response = await autocompleteService.getPlacePredictions({
                input: searchQuery,
                componentRestrictions: { country: ['us', 'ca'] }
            })
            if (response && response.predictions) {
                setResults(response.predictions.map(p => ({
                    id: p.place_id,
                    place_name: p.description,
                })))
                setIsOpen(true)
            } else {
                setResults([])
            }
        } catch (err) {
            console.error('Autocomplete error:', err)
            setResults([])
        } finally {
            setIsLoading(false)
        }
    }, [autocompleteService])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value
        setQuery(newQuery)
        setSelectedIndex(-1)

        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            searchLocations(newQuery)
        }, 300)
    }

    const handleSelect = async (result: LocationResult) => {
        setQuery(result.place_name)
        setResults([])
        setIsOpen(false)
        setSelectedIndex(-1)

        if (!geocoder) {
            onChange(result.place_name)
            return
        }

        try {
            const geoResponse = await geocoder.geocode({ placeId: result.id })
            if (geoResponse.results && geoResponse.results.length > 0) {
                const loc = geoResponse.results[0].geometry.location
                onChange(result.place_name, { lat: loc.lat(), lng: loc.lng() })
            } else {
                onChange(result.place_name)
            }
        } catch (err) {
            console.error('Geocoding error:', err)
            onChange(result.place_name)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) return

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0))
                break
            case 'Enter':
                e.preventDefault()
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    handleSelect(results[selectedIndex])
                }
                break
            case 'Escape':
                setIsOpen(false)
                setSelectedIndex(-1)
                break
        }
    }

    const handleClear = () => {
        setQuery('')
        onChange('')
        setResults([])
        inputRef.current?.focus()
    }

    return (
        <div ref={containerRef} className={cn('relative', className)}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                        'pl-9 pr-8',
                        error && 'border-status-error focus-visible:ring-status-error'
                    )}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {!isLoading && query && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                    {results.map((result, index) => (
                        <button
                            key={result.id}
                            type="button"
                            onClick={() => handleSelect(result)}
                            className={cn(
                                'w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-start gap-2',
                                index === selectedIndex && 'bg-muted'
                            )}
                        >
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <span className="line-clamp-2">{result.place_name}</span>
                        </button>
                    ))}
                </div>
            )}

            {error && <p className="text-xs text-status-error mt-1">{error}</p>}
        </div>
    )
}

export function LocationPicker(props: LocationPickerProps) {
    const [apiKey, setApiKey] = useState<string>('')

    useEffect(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    }, [])

    if (!apiKey) {
        return <InnerLocationPicker {...props} disabled={true} placeholder="Mapping API key missing..." />
    }

    return (
        <APIProvider apiKey={apiKey}>
            <InnerLocationPicker {...props} />
        </APIProvider>
    )
}
