import "./globals.css";

export const metadata = {
  title: "AnswerDesk — Client Portal",
  description: "Manage your answering service account",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
        {children}
      </body>
    </html>
  );
}
