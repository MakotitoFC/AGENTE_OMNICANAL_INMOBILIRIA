'use client';

interface LogoProps {
    width?: number | string;
    height?: number | string;
    showText?: boolean;
    dark?: boolean;
    className?: string;
}

export default function Logo({
    width = 40,
    height = 40,
    showText = false,
    dark = false,
    className = ''
}: LogoProps) {
    const primaryBlue = dark ? '#60A5FA' : '#1E40AF';
    const secondaryBlue = dark ? '#93C5FD' : '#3B82F6';
    const lightBlue = dark ? '#1E293B' : '#E0F2FE';
    const orangeAccent = '#F59E0B';
    const textColor = dark ? '#F8FAFC' : '#0F172A';
    const subtextColor = dark ? '#94A3B8' : '#475569';

    return (
        <div
            className={`flex items-center gap-3 select-none ${className}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}
        >
            <svg
                width={width}
                height={height}
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-all duration-300"
            >
                <rect x="34" y="16" width="10" height="36" rx="1.5" fill={secondaryBlue} fillOpacity="0.4" />
                <rect x="46" y="8" width="14" height="44" rx="2" fill={primaryBlue} fillOpacity="0.75" />
                <rect x="62" y="24" width="8" height="28" rx="1.2" fill={secondaryBlue} fillOpacity="0.3" />

                <rect x="50" y="14" width="2" height="4" rx="0.5" fill={lightBlue} />
                <rect x="54" y="14" width="2" height="4" rx="0.5" fill={lightBlue} />
                <rect x="50" y="22" width="2" height="4" rx="0.5" fill={lightBlue} />
                <rect x="54" y="22" width="2" height="4" rx="0.5" fill={lightBlue} />
                <rect x="50" y="30" width="2" height="4" rx="0.5" fill={lightBlue} />
                <rect x="54" y="30" width="2" height="4" rx="0.5" fill={lightBlue} />

                <path
                    d="M48 54 L62 42 L76 54 Z"
                    fill={secondaryBlue}
                    fillOpacity="0.25"
                    stroke={secondaryBlue}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />

                <path
                    d="M12 66 L44 38 L76 66"
                    stroke={primaryBlue}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 66 L44 38 L76 66"
                    stroke={orangeAccent}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity="0.9"
                />

                <path
                    d="M19 65 V82 H69 V65"
                    stroke={primaryBlue}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <circle cx="44" cy="52" r="3.5" fill={lightBlue} stroke={primaryBlue} strokeWidth="1.5" />

                <rect x="39" y="69" width="10" height="13" rx="1.5" fill={lightBlue} stroke={primaryBlue} strokeWidth="1.5" />
                <rect x="25" y="67" width="7" height="7" rx="1" fill={lightBlue} stroke={primaryBlue} strokeWidth="1.5" />
                <rect x="56" y="67" width="7" height="7" rx="1" fill={lightBlue} stroke={primaryBlue} strokeWidth="1.5" />
            </svg>

            {showText && (
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                    <span
                        style={{
                            fontFamily: 'var(--font-body), "Poppins", sans-serif',
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: textColor,
                            letterSpacing: '-0.02em',
                            transition: 'color 0.3s'
                        }}
                    >
                        Luz del Sol
                    </span>
                    <span
                        style={{
                            fontFamily: 'var(--font-body), "Poppins", sans-serif',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: orangeAccent,
                            transition: 'color 0.3s'
                        }}
                    >
                        Inmobiliaria
                    </span>
                </div>
            )}
        </div>
    );
}
