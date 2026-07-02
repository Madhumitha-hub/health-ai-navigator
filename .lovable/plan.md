# Scaling & Security Hardening Plan

Your app is a healthcare platform on TanStack Start + Supabase + a Render-hosted FastAPI ML backend, published at `ai-healthcare23.lovable.app`. Below is (A) what actually happens under load, and (B) the realistic attack surface + concrete fixes I can implement.

---

## A. "100 users log in at once — will it crash?"

Short answer: the **frontend/Worker won't crash**, but three specific layers will bottleneck. Here's the truth per layer:


| Layer                                  | Behavior under burst                                                                                        | Real risk                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lovable-hosted Worker (SSR + `/api/*`) | Auto-scales globally on Cloudflare. Effectively unlimited concurrency.                                      | None for 100 users.                                                               |
| Supabase (auth + Postgres + RLS)       | Free/Pro tier handles hundreds of concurrent auth calls fine.                                               | Only risk = a slow query with no index, or missing RLS causing a full-table scan. |
| Render ML backend (free tier)          | **Single instance, cold-starts in 10–30s, ~512MB RAM.** 100 concurrent `/predict` calls = queue + timeouts. | **This is the real crash point.**                                                 |
| Client-side ML health polling          | Every browser polls `/api/ml/health`. 100 users = 100 pollers → Render gets hammered.                       | Amplifies the Render bottleneck.                                                  |


**What to do (concrete, in priority order):**

1. **Cache `/api/ml/health` at the Worker for 30s** — 100 users → 1 upstream call instead of 100. Biggest single win.
2. **Slow the client health poll** from current interval to 60s when healthy, keep fast retries only when degraded.
3. **Add a request coalescer + short circuit** in `src/lib/ml-proxy.ts`: if upstream returned 5xx/timeout in the last 15s, serve the rule-based fallback immediately instead of piling requests onto Render.
4. **Cap upstream concurrency** in the Worker proxy (in-memory semaphore, e.g. max 8 in-flight per instance) — extra requests fall through to fallback rather than queueing on Render.
5. **Document upgrade path**: Render Starter ($7/mo) removes cold starts; that alone fixes 80% of "it feels broken" reports.

---

## B. Attack surface + fixes

Ranked by real risk for this app.

### 1. Auth & session

- **Current state:** Supabase Auth, JWT bearer attached by client middleware, `requireSupabaseAuth` / `requireRoleInRoute` on server routes, RLS on tables, roles in `user_roles` via `has_role()`. This is the right shape.
- **Gaps to close:**
  - Enable **leaked-password protection** and **MFA** in Supabase Auth settings (dashboard toggle — no code).
  - Set Supabase **OTP expiry ≤ 1 hour** and **password min length 12** (dashboard).
  - Verify every `/api/ml/*` route uses `requireRoleInRoute` — clinical write endpoints already do; audit read ones.

### 2. Brute-force login & credential stuffing

- Supabase Auth has built-in rate limits, but they're generous. Add a small **client-side lockout** (5 failed attempts → 60s cooldown) and rely on Supabase's server-side throttling. Per project rules, no custom backend rate-limiter exists — I'll flag this and only build one if you explicitly want it.

### 3. Abuse of the ML proxy (biggest cost/DoS risk)

- Any signed-in user can call `/api/ml/predict/*` in a loop and burn your Render quota.
- **Fix:** per-user in-memory quota in the Worker (e.g. 60 predictions/min/user). Cheap, effective, no infra.

### 4. Data exposure via RLS gaps

- Run the Supabase security scanner and fix any table missing `ENABLE ROW LEVEL SECURITY` or missing GRANTs. I'll do this as part of the plan.
- Confirm `prediction_audit`, `profiles`, `user_roles` have policies scoped to `auth.uid()` and no broad `anon` grants.

### 5. XSS / injection

- React escapes by default. Risk points: any `dangerouslySetInnerHTML`, the AI assistant rendering markdown, PDF report generation. I'll audit and add DOMPurify where needed.
- All user input already goes through Zod on the client — extend to server functions where missing.

### 6. CSRF

- Low risk: API uses `Authorization: Bearer` header (not cookies), so classic CSRF doesn't apply. No action needed.

### 7. Secrets exposure

- Anon/publishable Supabase key in the browser is fine (by design). Confirmed no service-role key is imported in client code. I'll grep to be sure.

### 8. Clickjacking / headers

- Add security headers at the Worker: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, and a basic `Content-Security-Policy`.

### 9. PII in logs

- Audit `console.error` / audit logging paths so patient identifiers aren't logged in plaintext.

### 10. Dependency vulns

- Run the dependency scanner and upgrade any flagged packages.

---

## What I'll actually change if you approve

**Code edits (small, scoped):**

1. `src/lib/ml-proxy.ts` — add 30s health cache, 15s failure short-circuit, per-instance concurrency cap (8), per-user quota (60/min).
2. `src/hooks/use-ml-health.ts` — poll every 60s when healthy, faster only on failure.
3. `src/server.ts` — add security response headers.
4. `src/routes/login.tsx` — client-side lockout after 5 failed attempts.
5. Audit any `dangerouslySetInnerHTML` / markdown render sites; add DOMPurify if found.

**Non-code (I'll list, you toggle in dashboard):**

- Supabase: enable leaked-password protection, MFA, tighten OTP expiry, set min password length 12.
- Render: upgrade to Starter ($7/mo) to remove cold starts (optional but recommended).

**Scans I'll run and act on:**

- Supabase security scanner (RLS/GRANT gaps).
- Dependency vulnerability scan.

Nothing in this plan touches your UI, business logic, or ML model behavior.

---

Want me to proceed with all of it, or a subset (e.g. just the ML-proxy hardening + security headers)?  
  
  
implement this as the backgrount of the current authentication oage and move the input tab for sigining in to the left side of the page and remove these text from the beckground "**Interactive 3D**

Bring your UI to life with beautiful 3D scenes. Create immersive experiences that capture attention and enhance your design."  
here is the promot for background of the authectrication page "You are given a task to integrate an existing React component in the codebase

The codebase should support:

- shadcn project structure  

- Tailwind CSS

- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 

If default path for components is not /components/ui, provide instructions on why it's important to create this folder

Copy-paste this component to /components/ui folder:

```tsx

splite.tsx

'use client'

import { Suspense, lazy } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

interface SplineSceneProps {

  scene: string

  className?: string

}

export function SplineScene({ scene, className }: SplineSceneProps) {

  return (

    <Suspense 

      fallback={

        <div className="w-full h-full flex items-center justify-center">

          <span className="loader"></span>

        </div>

      }

    >

      <Spline

        scene={scene}

        className={className}

      />

    </Suspense>

  )

}

demo.tsx

'use client'

import { SplineScene } from "@/components/ui/splite";

import { Card } from "@/components/ui/card"

import { Spotlight } from "@/components/ui/spotlight"

 

export function SplineSceneBasic() {

  return (

    <Card className="w-full h-[500px] bg-black/[0.96] relative overflow-hidden">

      <Spotlight

        className="-top-40 left-0 md:left-60 md:-top-20"

        fill="white"

      />

      

      <div className="flex h-full">

        {/* Left content */}

        <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">

          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">

            Interactive 3D

          </h1>

          <p className="mt-4 text-neutral-300 max-w-lg">

            Bring your UI to life with beautiful 3D scenes. Create immersive experiences 

            that capture attention and enhance your design.

          </p>

        </div>

        {/* Right content */}

        <div className="flex-1 relative">

          <SplineScene 

            scene="[https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode](https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode)"

            className="w-full h-full"

          />

        </div>

      </div>

    </Card>

  )

}

```

Copy-paste these files for dependencies:

```tsx

aceternity/spotlight

import React from "react";

import { cn } from "@/lib/utils";

type SpotlightProps = {

  className?: string;

  fill?: string;

};

export const Spotlight = ({ className, fill }: SpotlightProps) => {

  return (

    <svg

      className={cn(

        "animate-spotlight pointer-events-none absolute z-[1]  h-[169%] w-[138%] lg:w-[84%] opacity-0",

        className

      )}

      xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"

      viewBox="0 0 3787 2842"

      fill="none"

    >

      <g filter="url(#filter)">

        <ellipse

          cx="1924.71"

          cy="273.501"

          rx="1924.71"

          ry="273.501"

          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"

          fill={fill || "white"}

          fillOpacity="0.21"

        ></ellipse>

      </g>

      <defs>

        <filter

          id="filter"

          x="0.860352"

          y="0.838989"

          width="3785.16"

          height="2840.26"

          filterUnits="userSpaceOnUse"

          colorInterpolationFilters="sRGB"

        >

          <feFlood floodOpacity="0" result="BackgroundImageFix"></feFlood>

          <feBlend

            mode="normal"

            in="SourceGraphic"

            in2="BackgroundImageFix"

            result="shape"

          ></feBlend>

          <feGaussianBlur

            stdDeviation="151"

            result="effect1_foregroundBlur_1065_8"

          ></feGaussianBlur>

        </filter>

      </defs>

    </svg>

  );

};

```

```tsx

ibelick/spotlight

'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';

import { motion, useSpring, useTransform, SpringOptions } from 'framer-motion';

import { cn } from '@/lib/utils';

type SpotlightProps = {

  className?: string;

  size?: number;

  springOptions?: SpringOptions;

};

export function Spotlight({

  className,

  size = 200,

  springOptions = { bounce: 0 },

}: SpotlightProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  const [isHovered, setIsHovered] = useState(false);

  const [parentElement, setParentElement] = useState<HTMLElement | null>(null);

  const mouseX = useSpring(0, springOptions);

  const mouseY = useSpring(0, springOptions);

  const spotlightLeft = useTransform(mouseX, (x) => `${x - size / 2}px`);

  const spotlightTop = useTransform(mouseY, (y) => `${y - size / 2}px`);

  useEffect(() => {

    if (containerRef.current) {

      const parent = containerRef.current.parentElement;

      if (parent) {

        [parent.style](http://parent.style).position = 'relative';

        [parent.style](http://parent.style).overflow = 'hidden';

        setParentElement(parent);

      }

    }

  }, []);

  const handleMouseMove = useCallback(

    (event: MouseEvent) => {

      if (!parentElement) return;

      const { left, top } = parentElement.getBoundingClientRect();

      mouseX.set(event.clientX - left);

      mouseY.set(event.clientY - top);

    },

    [mouseX, mouseY, parentElement]

  );

  useEffect(() => {

    if (!parentElement) return;

    parentElement.addEventListener('mousemove', handleMouseMove);

    parentElement.addEventListener('mouseenter', () => setIsHovered(true));

    parentElement.addEventListener('mouseleave', () => setIsHovered(false));

    return () => {

      parentElement.removeEventListener('mousemove', handleMouseMove);

      parentElement.removeEventListener('mouseenter', () => setIsHovered(true));

      parentElement.removeEventListener('mouseleave', () =>

        setIsHovered(false)

      );

    };

  }, [parentElement, handleMouseMove]);

  return (

    <motion.div

      ref={containerRef}

      className={cn(

        'pointer-events-none absolute rounded-full bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops),transparent_80%)] blur-xl transition-opacity duration-200',

        'from-zinc-50 via-zinc-100 to-zinc-200',

        isHovered ? 'opacity-100' : 'opacity-0',

        className

      )}

      style={{

        width: size,

        height: size,

        left: spotlightLeft,

        top: spotlightTop,

      }}

    />

  );

}

```

```tsx

shadcn/card

import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, ...props }, ref) => (

  <div

    ref={ref}

    className={cn(

      "rounded-lg border bg-card text-card-foreground shadow-sm",

      className,

    )}

    {...props}

  />

))

Card.displayName = "Card"

const CardHeader = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, ...props }, ref) => (

  <div

    ref={ref}

    className={cn("flex flex-col space-y-1.5 p-6", className)}

    {...props}

  />

))

CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<

  HTMLParagraphElement,

  React.HTMLAttributes<HTMLHeadingElement>

>(({ className, ...props }, ref) => (

  <h3

    ref={ref}

    className={cn(

      "text-2xl font-semibold leading-none tracking-tight",

      className,

    )}

    {...props}

  />

))

CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<

  HTMLParagraphElement,

  React.HTMLAttributes<HTMLParagraphElement>

>(({ className, ...props }, ref) => (

  <p

    ref={ref}

    className={cn("text-sm text-muted-foreground", className)}

    {...props}

  />

))

CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, ...props }, ref) => (

  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />

))

CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<

  HTMLDivElement,

  React.HTMLAttributes<HTMLDivElement>

>(({ className, ...props }, ref) => (

  <div

    ref={ref}

    className={cn("flex items-center p-6 pt-0", className)}

    {...props}

  />

))

CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

Install NPM dependencies:

```bash

@splinetool/runtime, @splinetool/react-spline, framer-motion

```

Implementation Guidelines

 1. Analyze the component structure and identify all required dependencies

 2. Review the component's argumens and state

 3. Identify any required context providers or hooks and install them

 4. Questions to Ask

 - What data/props will be passed to this component?

 - Are there any specific state management requirements?

 - Are there any required assets (images, icons, etc.)?

 - What is the expected responsive behavior?

 - What is the best place to use this component in the app?

Steps to integrate

 0. Copy paste all the code above in the correct directories

 1. Install external dependencies

 2. Fill image assets with Unsplash stock images you know exist

 3. Use lucide-react icons for svgs or logos if component requires them

&nbsp;