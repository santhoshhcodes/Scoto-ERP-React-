const BASE_URL_KEY = 'BASE_URL';

const SERVERS: string[] = [
    import.meta.env.VITE_API_URL || 'http://localhost:5000',
];

let memoryCachedBaseUrl: string | null = null;
let inFlightPromise: Promise<string> | null = null;

const checkEndpoint = async (
    url: string,
    timeout = 2500,
): Promise<string> => {
    const controller = new AbortController();

    const timer = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        const response = await fetch(`${url}/health`, {
            method: 'GET',
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`Status ${response.status}`);
        }

        return url;
    } finally {
        clearTimeout(timer);
    }
};

const discoverBaseURL = async (): Promise<string> => {
    // 1. Memory cache
    if (memoryCachedBaseUrl) {
        try {
            return await checkEndpoint(
                memoryCachedBaseUrl,
                1200,
            );
        } catch {
            memoryCachedBaseUrl = null;
        }
    }

    // 2. Browser cache
    const cached = localStorage.getItem(BASE_URL_KEY);

    if (cached) {
        try {
            const valid = await checkEndpoint(cached, 1200);

            memoryCachedBaseUrl = valid;

            return valid;
        } catch {
            localStorage.removeItem(BASE_URL_KEY);
        }
    }

    // 3. Find available server
    try {
        const fastestServer = await Promise.any(
            SERVERS.map((url) =>
                checkEndpoint(url, 3000),
            ),
        );

        memoryCachedBaseUrl = fastestServer;

        localStorage.setItem(
            BASE_URL_KEY,
            fastestServer,
        );

        console.log(
            '[Network] Backend:',
            fastestServer,
        );

        return fastestServer;
    } catch {
        throw new Error(
            'Backend unreachable.',
        );
    }
};

export const getBaseURL = async (): Promise<string> => {
    if (inFlightPromise) {
        return inFlightPromise;
    }

    inFlightPromise = discoverBaseURL().finally(() => {
        inFlightPromise = null;
    });

    return inFlightPromise;
};

export const clearBaseURL = (): void => {
    memoryCachedBaseUrl = null;
    localStorage.removeItem(BASE_URL_KEY);
};