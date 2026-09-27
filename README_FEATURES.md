# InvoiceOS - Professional Invoice Management Platform

A modern, feature-rich invoice management application built with Next.js 14, designed to compete with enterprise solutions like QuickBooks, FreshBooks, and Zoho.

## Key Features

### Core Invoicing
- **80+ Professional Templates** - Across 10+ categories (Classic, Modern, Minimal, Bold, Elegant, Creative, Industry-Specific)
- **Invoice Templates** - Browse, search, and preview all templates before creating invoices
- **Template Gallery** - Fully interactive template selection with industry-specific recommendations
- **Smart Line Items** - Add unlimited items with quantity, rate, and auto-calculation
- **Multi-Currency Support** - 30+ currencies with real-time formatting
- **Global Tax Management** - Automatic tax rates for 20+ countries with regional variations
- **E-Invoice Networks** - Support for PEPPOL, ZUGFeRD, NF-e, JP e-Invoice, AU RCTI

### Advanced Features

#### PDF & Document Export
- HTML-formatted invoice download with professional styling
- CSV export for accounting systems
- Print-ready invoicing with page formatting
- Custom invoice number generation

#### Tax Calculator
- 20+ country support with standard and reduced rates
- Per-region tax variations (US states, EU countries)
- Tax breakdown calculation with effective rates
- Discount and fee calculation support
- Tax rate validation for compliance

#### Payment Management
- Track invoice status (draft, sent, pending, paid, overdue)
- Automatic overdue detection with severity levels
- Payment reminders system with customizable rules
- Smart reminder scheduling (once, daily, weekly)
- Email notifications for payment reminders
- Client payment portal with QR codes

#### Dashboard Analytics
- Total revenue tracking
- Revenue breakdown (Paid, Pending, Overdue)
- Conversion rate monitoring
- Payment status percentages
- Quick overview of financial health

#### Invoice Duplication
- One-click invoice duplication
- Preserve all line items and details
- Quick copy for recurring clients
- Reduce data entry errors

#### Client Management
- Comprehensive client database
- Quick-fill client information
- Email tracking and contact management
- Client status monitoring

#### Smart Reminders
- Customizable reminder rules
- Automatic scheduling based on due dates
- Multiple reminder frequencies
- Variable reminder templates
- Batch reminder generation

### User Experience

#### Design System
- Responsive design optimized for mobile, tablet, desktop
- Dark/Light mode support (color system with 20+ color variables)
- Accessible component library
- Consistent typography system
- Professional UI components

#### Navigation & Organization
- Sidebar navigation (removable for full-width layouts)
- Dashboard with financial overview
- Dedicated pages for invoices, templates, payments, reminders, clients
- Global networks management interface
- Settings and configuration panel

#### Mobile Responsiveness
- Touch-friendly interface with 44px+ tap targets
- Mobile-first design approach
- Responsive grid layouts
- Optimized forms for small screens

## Technical Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui
- **Database**: Supabase (with optional Neon support)
- **Authentication**: Better Auth
- **Icons**: Lucide React
- **Export**: HTML, CSV with professional formatting
- **Database Schema**: Full audit trail with created_at/updated_at

## Competitive Advantages

### vs QuickBooks
- Faster invoice creation (80+ templates vs limited options)
- Modern interface optimized for remote work
- Real-time tax rate updates across countries
- Simpler pricing model

### vs FreshBooks
- No project/time tracking bloat - focused on invoicing
- Advanced template system with 80+ designs
- Global tax support with automatic calculations
- Lower implementation complexity

### vs Zoho
- Lightweight and fast (no page bloat)
- Easier onboarding with interactive templates
- Comprehensive tax calculator built-in
- More modern UX/UI design

### vs Wave
- Professional templates (vs basic Wave designs)
- Advanced tax management system
- Global compliance support
- Better reporting analytics

## API Routes

### Invoices
- `GET /api/invoices` - List invoices with filtering
- `GET /api/invoices/[id]` - Get invoice details
- `POST /api/invoices` - Create new invoice
- `PUT /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Delete invoice
- `POST /api/invoices/[id]/duplicate` - Duplicate invoice

### Clients
- `GET /api/clients` - List all clients
- `POST /api/clients` - Add new client
- `PUT /api/clients/[id]` - Update client
- `DELETE /api/clients/[id]` - Remove client

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Record payment
- `GET /api/payments/analytics` - Payment analytics

### Reminders
- `GET /api/reminders/rules` - Get reminder rules
- `PUT /api/reminders/rules` - Update rules
- `POST /api/reminders/send` - Trigger reminders

## Getting Started

### Installation
```bash
npm install
# or
yarn install
```

### Environment Setup
```bash
cp .env.local.example .env.local
# Fill DATABASE_URL, NextAuth, Stripe, Resend, and cron values.
# Keep DEMO_MODE=true only for keyless previews.
```

### Running Locally
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

### Building for Production
```bash
npm run build
npm run start
```

## File Structure

```
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Dashboard
│   ├── invoices/            # Invoice management
│   ├── templates/           # Template gallery
│   ├── clients/             # Client management
│   ├── payments/            # Payment tracking
│   ├── reminders/           # Reminder management
│   ├── reports/             # Reporting
│   ├── networks/            # E-invoice networks
│   └── settings/            # Settings
├── components/
│   ├── Sidebar.tsx          # Navigation
│   ├── DashboardAnalytics.tsx # Analytics cards
│   ├── InvoiceActions.tsx   # Invoice actions menu
│   ├── TemplateGallery.tsx  # Template selection
│   └── ...
├── lib/
│   ├── constants.ts         # Global constants
│   ├── templates.ts         # 80+ invoice templates
│   ├── export.ts            # PDF/CSV export
│   ├── tax-calculator.ts    # Advanced tax calculations
│   ├── reminders.ts         # Reminder system
│   └── ...
└── public/                  # Static assets
```

## Integration Points

### Payment Gateway
- Ready for Stripe integration
- Payment portal with unique tokens
- QR code generation for mobile payments

### Email System
- Reminder email templates
- Invoice distribution ready
- Client notification support

### Accounting Integration
- CSV export for accounting software
- Invoice data standardization
- Multi-currency support

## Performance Optimizations

- Server-side rendering (RSC) for initial load
- Client-side caching with SWR
- Image optimization with Next.js Image component
- Code splitting and lazy loading
- Optimized bundle size (~150KB)

## Security Features

- HTTPS enforcement
- CSRF protection
- SQL injection prevention (parameterized queries)
- XSS protection via React
- Secure session management
- Row-level security ready

## Accessibility

- WCAG 2.1 compliance
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation
- Screen reader support
- Color contrast compliance

## Future Roadmap

- Bank account integration for automatic reconciliation
- AI-powered invoice insights
- Recurring invoice automation
- Multi-company support
- Team collaboration features
- Advanced reporting (P&L, tax reports)
- Mobile app (React Native)
- Blockchain invoice verification

## Support & Documentation

For issues, feature requests, or documentation, refer to:
- Technical docs in `TEMPLATES_README.md`
- Feature implementation guide in commit messages
- Component documentation in JSDoc comments

## License

MIT - See LICENSE file for details

---

**InvoiceOS** - The modern alternative to legacy invoicing software. Built for freelancers, SMBs, and enterprises that value speed, design, and compliance.
