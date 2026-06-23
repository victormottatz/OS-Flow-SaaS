---
name: MGV Technical Precision
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f3'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e2'
  on-surface: '#1b1b1c'
  on-surface-variant: '#4c4547'
  inverse-surface: '#313031'
  inverse-on-surface: '#f3f0f0'
  outline: '#7d7577'
  outline-variant: '#cfc4c6'
  surface-tint: '#605e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#868383'
  inverse-primary: '#c9c6c5'
  secondary: '#785900'
  on-secondary: '#ffffff'
  secondary-container: '#fdc003'
  on-secondary-container: '#6c5000'
  tertiary: '#000001'
  on-tertiary: '#ffffff'
  tertiary-container: '#1a1c1d'
  on-tertiary-container: '#838485'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e6e1e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#484646'
  secondary-fixed: '#ffdf9e'
  secondary-fixed-dim: '#fabd00'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5b4300'
  tertiary-fixed: '#e2e2e3'
  tertiary-fixed-dim: '#c6c6c7'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#fcf9f8'
  on-background: '#1b1b1c'
  surface-variant: '#e5e2e2'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 260px
  max-content-width: 1440px
---

## Brand & Style

This design system is engineered for a technical assistance management environment where clarity, speed of data entry, and operational oversight are paramount. The aesthetic is **Corporate Modern with a Technical Edge**, prioritizing high-density information displays without sacrificing legibility.

The brand personality is authoritative and dependable. It utilizes a high-contrast palette to establish clear hierarchies, drawing inspiration from industrial equipment interfaces and modern administrative dashboards. The style relies on clean lines, precise alignment, and a "function-first" philosophy to evoke an emotional response of efficiency and professional rigor. Whitespace is used strategically to separate complex data modules, ensuring that even the most information-dense screens remain navigable.

## Colors

The palette is anchored by a dominant **Carbon Black** (#1C1B1B) used for high-level navigation, headers, and primary text, ensuring a grounded and serious tone. **Vivid Amber** (#FFC107) serves as the primary accent color, reserved for high-priority actions, active states, and critical highlights, providing immediate visual cues against the neutral backdrop.

The interface primarily uses a **Light Mode** foundation. Neutral grays (#F4F4F5 and #EAE7E7) are utilized to differentiate surface levels, such as the distinction between a sidebar and a main content area. A set of semantic "Status Colors" is introduced for technical indicators (Success, Warning, Error, Info), ensuring that equipment statuses and service alerts are instantly recognizable through standardized color psychology.

## Typography

The design system exclusively utilizes **Inter** for its exceptional legibility in technical contexts and its robust support for numerical data. 

- **Headlines:** Use Bold weights with slight negative letter-spacing to maintain a compact, authoritative look.
- **Data Display:** For tables and technical logs, use the `data-tabular` style which enables tabular/lining figures, ensuring that columns of numbers align perfectly for quick scanning.
- **Labels:** Small, uppercase labels with increased letter-spacing are used for section headers within complex forms and table headers.
- **Scaling:** On mobile devices, `headline-lg` should be replaced by `headline-md` to maintain vertical rhythm.

## Layout & Spacing

The layout utilizes a **Fixed-Fluid Hybrid Grid**. The primary navigation is a fixed-width left sidebar (260px), while the main content area is a fluid 12-column grid that expands to a maximum width of 1440px.

A strict 4px base unit (n*4) governs all spacing decisions to maintain mathematical harmony. 
- **Data Tables:** Use a condensed spacing model (8px vertical padding) to maximize information density.
- **Forms:** Use a more relaxed spacing model (16px - 24px between fields) to prevent user fatigue during complex data entry.
- **Breakpoints:** 
    - *Desktop (1024px+):* Full 12-column grid, permanent sidebar.
    - *Tablet (768px - 1023px):* 8-column grid, collapsible sidebar into an icon-only rail.
    - *Mobile (<768px):* 4-column grid, overlay hamburger menu, vertical stack for all form fields.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** rather than heavy shadows. This maintains a clean, "flat-modern" administrative look.

1.  **Level 0 (Background):** #F4F4F5 — The canvas for the application.
2.  **Level 1 (Sidebar/Cards):** #FFFFFF — Elevated surfaces use pure white with a very subtle 1px border (#EAE7E7) to define boundaries.
3.  **Level 2 (Modals/Popovers):** #FFFFFF — These use a soft, low-opacity ambient shadow (0px 4px 20px rgba(0,0,0,0.08)) to indicate temporary interaction layers.

The sidebar uses a dark background (#1C1B1B) to create a strong "anchor" for the application, with active states highlighted by a vertical Amber (#FFC107) stroke on the left edge.

## Shapes

The shape language is **Rounded (0.5rem)**. This standard rounding balances technical precision with a friendly, modern interface, moving away from the more severe edges of technical software toward a contemporary professional application feel.

- **Input Fields & Buttons:** 8px (0.5rem) corner radius.
- **Large Container Cards:** 16px (1rem) corner radius for a distinct structural appearance.
- **Status Badges:** Full-pill rounding to distinguish them from interactive buttons.

## Components

### Sidebars
The sidebar is the primary navigation hub. It uses the Carbon Black (#1C1B1B) background. Navigation items feature 16px horizontal padding. The active state includes a white text label and a 4px Amber (#FFC107) left-border accent.

### Data Tables
Tables are the heart of the system.
- **Header:** Light gray (#F4F4F5) background, uppercase `label-md` typography.
- **Rows:** 1px bottom border (#EAE7E7). Hover state uses a very subtle tint (#F9F9F9).
- **Cells:** Vertical alignment should be centered. Numerical data is always right-aligned.

### Status Indicators (Badges)
Small, non-interactive chips.
- **Style:** Light tinted background (10% opacity of the semantic color) with high-contrast text of the same hue.
- **Shape:** Pill-shaped.

### Complex Forms
- **Input Fields:** 1px border (#EAE7E7). On focus, the border changes to Carbon Black (#1C1B1B) with a 2px Amber ring.
- **Grouping:** Use subtle 1px dividers or light gray section headers to group related technical data points.
- **Validation:** Error messages appear immediately below the field in `label-sm` red text.

### Buttons
- **Primary:** Carbon Black (#1C1B1B) background with White text.
- **Secondary:** Amber (#FFC107) background with Carbon Black text (used for the most important "Action" like "Start Service").
- **Ghost:** Transparent background with a 1px border. Used for secondary actions in tables.