export const metadata = {
  title: 'InvoiceOS',
  description: 'Invoice management for Collins Lawncare & Services',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  )
}
