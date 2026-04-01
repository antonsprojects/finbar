# User Profile: Finbar

## Summary
Finbar is a self-employed construction worker in Amsterdam who mainly manages and executes house renovations. He is both the business owner and the primary user of the product.

He is highly capable in practical, hands-on work, but weak in digital organization. His current workflow functions, but only through improvisation, memory, paper, WhatsApp, and persistence. The main problem is not that the work itself fails. The main problem is lack of oversight and the frustration that comes with that.

---

## Basic Profile
- **Name:** Finbar
- **Role:** Self-employed renovation contractor
- **Location:** Amsterdam
- **Business type:** House renovations
- **User type:** Single primary user
- **Context of use:** On-site, mobile, interrupted, dusty, noisy, fast-moving work environment

---

## Core User Problem
Finbar struggles with **oversight**.

The two main operational problems are:
1. Knowing **which freelancer is available on which day**
2. Knowing **who is scheduled when**, plus what still needs to happen and what is happening today

This means his real pain is not “project management” in a broad sense. It is:
- planning
- scheduling
- tracking today’s work
- tracking outstanding work
- reducing mental overhead

---

## What He Needs Most
Finbar needs one simple place that shows:
- who is working today
- who is available on which day
- what still needs to happen
- what is planned next
- what is overdue or still unassigned

Validated for a later phase (not required for the first release):
- linking tasks/to-do items to specific workers

---

## Current Workflow and Tools
Finbar currently works with a fragmented mix of:
- **WhatsApp** all the time
- **voice input to Google** for asking questions
- **handwritten notes**
- **printed binders and paper sheets**
- **Excel**, but clumsily
- **email**, which works reasonably well but information gets lost

His current workflow is not clean or systematic, but it is functional enough to keep work moving.

---

## Important Behavioral Traits
### Strong practical capability
- Can build and solve physical problems effectively
- Work quality and job execution are not the core issue

### Weak digital organization
- Described as a disaster with tech
- Loses structure easily
- Misplaces information
- Gets frustrated by digital tools and clutter

### High improvisation tolerance
- Recovers from chaos
- Cuts through problems quickly
- Relies on instinct, memory, and ad hoc solutions

### Frustration threshold
- Operationally effective, but frequently frustrated by the lack of overview
- Likely to reject tools that add friction or require discipline he will not maintain

---

## Device and Reliability Context
Finbar goes through about **three phones per year**.

This implies:
- device loss or breakage is realistic
- local-only storage is unacceptable
- the product must be **cloud-based / SaaS**
- data must survive broken, lost, or replaced devices
- login and continuation on a new device must be simple

---

## Environmental Context
The product will be used in an environment that is:
- physically messy
- dusty
- noisy
- interrupt-driven
- often mobile
- not desk-centered

The current planning system is embedded in the worksite itself:
- handwritten sheets
- printed pages
- marked-up paper
- quick visual checking while work is happening

This suggests the digital product should act more like a **site board** than office software.

---

## Accessibility / Legibility Needs
Finbar needs a visible toggle to use the product **without reading glasses when they are not around**.

This means the product should support a dedicated high-legibility mode such as:
- larger text
- larger tap targets
- stronger contrast
- more spacing
- reduced visual density
- clearer labels
- less dependence on small icons

This is not a minor accessibility enhancement. It is a core usage requirement.

---

## Likely Usage Patterns
Finbar is likely to:
- pick phone vs another device depending on where he is; on site, the phone is the natural default
- check it quickly while on site
- use it while distracted or interrupted
- need glanceable information more than detailed records
- avoid heavy typing
- prefer very fast actions over precise structured input

He is unlikely to:
- maintain a complex system carefully
- enjoy filling long forms
- tolerate deep menus or hidden controls
- keep a digital system organized if it becomes too demanding

---

## Mental Model
Finbar likely does not think in terms of:
- databases
- workflows
- project management systems
- formal admin structures

He likely thinks in terms of:
- what is happening today
- who is where
- what still needs doing
- who can do it
- what is blocked
- what must happen next

The product should match that mental model.

---

## User Goals
### Primary goals
- Get overview of today
- Get overview of this week
- Know who is working where
- Know who is available
- Know what still needs to be done

### Secondary goals
- Reduce frustration
- Reduce reliance on memory
- Reduce scattered information across WhatsApp, paper, and Excel
- Keep data safe across devices

### Future goals
- Link tasks to workers (confirmed; ship after core overview and scheduling work)
- Fast voice-based task or note input (strong fit with his habits; explicitly not the first shipping step—plan after core quick-entry flows)

---

## Risks and Constraints
### Risks
- Tool becomes too complex
- Tool feels like office software instead of a worksite tool
- Too much typing required
- Too many features too early
- Data entry burden is higher than current paper workflow
- UI becomes too small or dense for real-world use

### Constraints
- Must be very simple
- Must work across devices
- Must save automatically
- Must be readable under imperfect conditions
- Must be usable by someone with poor digital habits

---

## Product Implications
Based on what we know, the product should be:
- **SaaS / cloud-based**
- **mobile-first on site**, with a solid experience when he uses a larger screen elsewhere
- **weekly horizon first** (near-term planning matters much more than long-term forecasting)
- **scheduling and availability as first-class** (crews and who is available change often—often a different crew almost every day)
- **overview-first**
- **fast to update**
- **high-legibility**
- **simple and forgiving**
- **built for interrupted on-site use**

It should not initially try to be:
- a full construction management suite
- a CRM
- an invoicing system
- a document management platform
- a complex ERP-style planner

---

## Core Questions the Product Must Answer
Every important screen should help Finbar answer one or more of these:

1. **Who is working today?**
2. **What still needs to happen?**
3. **Who is available when?**

If a feature does not support one of these questions, it is probably not part of the MVP.

---

## Working Product Thesis
A good first product for Finbar is:

**A cloud-based digital site board for renovation work that shows today’s tasks, worker schedule, and next actions in a format that remains readable and usable on site.**

---

## Validated assumptions
These were checked with Finbar and hold, with the nuances below:

| Topic | Outcome |
| --- | --- |
| **Primary device** | Use depends on **where he is**—not phone-only. Optimize for phone on site; keep the product usable on desktop or tablet when that fits. |
| **Planning horizon** | **Weekly planning matters a lot**; long-term forecasting is secondary. |
| **Scheduling depth** | Availability and crew composition **change constantly** (often a different crew almost every day)—**dedicated scheduling is justified**. |
| **Tasks ↔ workers** | **Yes, in the future**—not a requirement for the first release. |
| **Voice input** | **Very strong behavioral fit**, but **not the first step**; ship after core typed/quick-entry flows, with room to add voice later. |
| **Core value** | **Reducing mental overhead** beats storing more information for its own sake—prefer overview and low friction over heavy data entry. |

---

## Design Principles Derived From User Research
1. **Overview first**
2. **Cloud-safe by default**
3. **Readable under bad conditions**
4. **Fast to update**
5. **Minimal typing**
6. **Forgiving of chaos**
7. **Built for the real worksite, not the office**