import type { Metadata } from "next";
export const metadata:Metadata={title:"PNG Scout",description:"Private product research workspace"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
