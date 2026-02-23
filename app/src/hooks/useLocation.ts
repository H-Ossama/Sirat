import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationState {
    coords: { lat: number; lon: number } | null;
    city: string | null;
    loading: boolean;
    error: string | null;
}

export function useLocation() {
    const [state, setState] = useState<LocationState>({
        coords: null,
        city: null,
        loading: true,
        error: null,
    });

    const getLocation = useCallback(async () => {
        // Check cache first
        const cacheKey = 'user_location_cache';
        const cached = localStorage.getItem(cacheKey);
        const today = new Date().toDateString();

        if (cached) {
            try {
                const { coords, city, date } = JSON.parse(cached);
                if (date === today) {
                    setState({ coords, city, loading: false, error: null });
                    return coords;
                }
            } catch (e) {
                console.warn('Failed to parse location cache', e);
            }
        }

        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location !== 'granted') {
                const request = await Geolocation.requestPermissions();
                if (request.location !== 'granted') {
                    throw new Error('Location permission denied');
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 5000
            });
            const { latitude, longitude } = position.coords;

            // Optional: Reverse geocode to get city name for UI
            let cityName = null;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                const data = await response.json();
                cityName = data.address.city || data.address.town || data.address.village || data.address.suburb || 'موقعي الحالي';
            } catch (e) {
                console.warn('Reverse geocoding failed', e);
                cityName = 'موقعي الحالي';
            }

            const result = { lat: latitude, lon: longitude };
            setState({
                coords: result,
                city: cityName,
                loading: false,
                error: null,
            });

            // Save to cache
            localStorage.setItem(cacheKey, JSON.stringify({
                coords: result,
                city: cityName,
                date: today
            }));

            return result;
        } catch (err: any) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: err.message || 'Failed to get location'
            }));
            return null;
        }
    }, []);

    useEffect(() => {
        getLocation();
    }, [getLocation]);

    return { ...state, refresh: getLocation };
}
