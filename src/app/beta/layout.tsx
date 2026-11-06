import {BetaProvider} from '@/components/beta/store';
export default function BetaLayout({children}:{children:React.ReactNode}){return <BetaProvider>{children}</BetaProvider>;}
