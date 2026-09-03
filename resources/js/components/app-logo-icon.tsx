import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="15" y="4" width="10" height="32" rx="3" />
            <rect x="4" y="15" width="32" height="10" rx="3" />
        </svg>
    );
}
