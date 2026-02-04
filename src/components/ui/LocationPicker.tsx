'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { MapPin, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

interface LocationResult {
    id: string
    place_name: string
    center: [number, number] // [lng, lat]
    text: string
}

interface LocationPickerProps {
    value: string
    onChange: (value: string, coordinates?: { lat: number; lng: number }) => void
    placeholder?: string
    className?: string
    error?: string
    disabled?: boolean
}

export function LocationPicker({
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
        if (!searchQuery || searchQuery.length < 3 || !MAPBOX_TOKEN) {
            setResults([])
            return
        }

        setIsLoading(true)
        try {
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${MAPBOX_TOKEN}&types=address,place,poi&limit=5`
            )
            const data = await response.json()

            if (data.features) {
                setResults(data.features.map((feature: any) => ({
                    id: feature.id,
                    place_name: feature.place_name,
                    center: feature.center,
                    text: feature.text,
                })))
                setIsOpen(true)
            }
        } catch (error) {
            console.error('Geocoding error:', error)
            setResults([])
        } finally {
            setIsLoading(false)
        }
    }, [])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newQuery = e.target.value
        setQuery(newQuery)
        setSelectedIndex(-1)

        // Debounce API calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        debounceRef.current = setTimeout(() => {
            searchLocations(newQuery)
        }, 300)
    }

    const handleSelect = (result: LocationResult) => {
        setQuery(result.place_name)
        onChange(result.place_name, {
            lat: result.center[1],
            lng: result.center[0],
        })
        setResults([])
        setIsOpen(false)
        setSelectedIndex(-1)
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
