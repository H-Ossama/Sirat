export interface ShamelaBook {
    id: number;
    name: string;
    author: string;
}

const STORAGE_KEY = 'shamela_catalog';

class ShamelaService {
    getCachedIndex(): ShamelaBook[] {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Failed to parse cached Shamela index', e);
            }
        }
        return [];
    }

    async syncMasterIndex(onProgress: (count: number) => void): Promise<ShamelaBook[]> {
        // This is a placeholder implementation. 
        // In a real scenario, this would fetch from a remote API.
        try {
            // Attempting to fetch from a likely location
            const response = await fetch('https://raw.githubusercontent.com/master-index/shamela-books/main/index.json');
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json() as ShamelaBook[];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            onProgress(data.length);
            return data;
        } catch (error) {
            console.error('Sync failed:', error);
            return this.getCachedIndex();
        }
    }

    getPdfUrl(id: number | string): string {
        return `https://shamela.ws/book/${id}/pdf`;
    }
}

export const shamelaService = new ShamelaService();
