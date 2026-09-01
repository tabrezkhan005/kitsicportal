# KITSIC Role Dashboards & Leadership Signup

Gen 4 leadership roles, what each dashboard shows, and how heads register separately from members.

---

## Leadership roles (Gen 4)

| Role | Slug | Dashboard focus |
|------|------|-----------------|
| President | `president` | Full club KPIs, all heads, approvals, audit, settings |
| Vice President | `vice_president` | Operations, events, tasks, member activity, analytics |
| Secretary | `secretary` | Meetings, MOM, attendance, certificates, announcements |
| Joint Secretary | `joint_secretary` | Meeting support, attendance, events, announcements |
| Student Lead | `student_lead` | Member batches, attendance, tasks, learning |
| Finance Head | `finance_head` | Budget, expenses, sponsors, reports |
| Resource Head | `resource_head` | Learning modules, resources, member skills |
| Logistics Head | `logistics_head` | Inventory, venues, event execution |
| Literature Head | `literature_head` | Content, learning, publications, announcements |
| Entrepreneurship Head | `entrepreneurship_head` | Projects, pitch events, partnerships |
| Technical Head | `technical_head` | Projects, task board, whiteboard, analytics |
| Digital Media Head | `digital_media_head` | Social content, event promo, analytics |
| Hospitality Head | `hospitality_head` | Guest experience, events, refreshments, inventory |

Gen 5 (`member`) uses the standard member overview — tasks, events, learning, attendance check-in.

---

## Per-role dashboard (sidebar + home widgets)

### President
- **Home:** Club-wide KPIs, leadership command panel, pending approvals
- **Sidebar:** Everything (full access)
- **Key actions:** Members, Meetings, Reports, Settings, Audit

### Vice President
- **Home:** Operations overview, event pipeline, task completion
- **Sidebar:** Analytics, Members, Events, Tasks, Projects, Meetings, Reports
- **Key actions:** Delegate tasks, review events, track heads

### Secretary
- **Home:** Meeting schedule, attendance rate, MOM status
- **Sidebar:** Meetings, Attendance, Announcements, Certificates, Events, Reports
- **Key actions:** Schedule Meet, sync attendance, export reports

### Joint Secretary
- **Home:** Meeting + attendance support queue
- **Sidebar:** Meetings, Attendance, Events, Announcements
- **Key actions:** QR sessions, meeting attendance page, announcements

### Student Lead
- **Home:** Batch member count, attendance, assigned tasks
- **Sidebar:** Members, Attendance, Tasks, Learning, Whiteboard
- **Key actions:** Check-in, assign tasks to batch

### Finance Head
- **Home:** Budget summary, expenses, sponsor pipeline
- **Sidebar:** Finance, Reports, Events (costs)
- **Key actions:** Log expenses, manage sponsors, export finance report

### Resource Head
- **Home:** Resource library stats, learning modules
- **Sidebar:** Resources, Learning, Members, Announcements
- **Key actions:** Upload resources, publish quizzes

### Logistics Head
- **Home:** Inventory levels, upcoming event logistics
- **Sidebar:** Inventory, Events, Calendar, Tasks
- **Key actions:** Stock check, event venue prep

### Literature Head
- **Home:** Content calendar, learning modules
- **Sidebar:** Learning, Resources, Announcements, Events
- **Key actions:** Publish content, create literary quizzes

### Entrepreneurship Head
- **Home:** Active projects, pitch events
- **Sidebar:** Projects, Events, Members, Tasks
- **Key actions:** Track startups, schedule pitch night

### Technical Head
- **Home:** Project progress, sprint board, whiteboard activity
- **Sidebar:** Projects, Tasks, Whiteboard, Analytics, Members
- **Key actions:** Assign tech tasks, run sprints

### Digital Media Head
- **Home:** Announcements reach, upcoming events to promote
- **Sidebar:** Announcements, Events, Analytics, Resources
- **Key actions:** Post updates, promote events

### Hospitality Head
- **Home:** Event guest prep, inventory for refreshments
- **Sidebar:** Events, Inventory, Tasks, Members
- **Key actions:** Volunteer roster, supplies checklist

---

## Leadership signup (separate from members)

**URL:** `https://portal.kitsic.in/signup/leadership`

### Flow
1. Head selects their **role** from dropdown
2. Enters **invite code** (from President)
3. Fills name, email, phone, password
4. Receives **OTP email** (same as member signup)
5. Verifies OTP → account created with **leadership role only**
6. Redirected to dashboard with **role-specific home panel**

### If already a member
- Same email can upgrade: member role is replaced with the selected leadership role
- Cannot register twice as leadership

### Invite codes (initial — share with each head, then rotate)

| Role | Code |
|------|------|
| President | `KITSIC-PRES-26` |
| Vice President | `KITSIC-VP-26` |
| Secretary | `KITSIC-SEC-26` |
| Joint Secretary | `KITSIC-JSEC-26` |
| Student Lead | `KITSIC-SL-26` |
| Finance Head | `KITSIC-FIN-26` |
| Resource Head | `KITSIC-RES-26` |
| Logistics Head | `KITSIC-LOG-26` |
| Literature Head | `KITSIC-LIT-26` |
| Entrepreneurship Head | `KITSIC-ENT-26` |
| Technical Head | `KITSIC-TECH-26` |
| Digital Media Head | `KITSIC-MEDIA-26` |
| Hospitality Head | `KITSIC-HOSP-26` |

Each code has a **max use limit** (1–5). President should generate new codes after registration wave.

---

## Deploy steps

```bash
npm run db:migrate:leadership-roles
npm run db:seed   # syncs roles + permissions
```

Then redeploy Vercel.

---

## Assigning roles to existing members manually

President can also assign roles from **Members** page, or run:

```bash
npm run db:create:president   # example for president account
```

For bulk assignment, use Members → select member → assign role.
