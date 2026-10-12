import { useState, useMemo } from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * Dental booking form with conditional logic.
 * Priority path: postal code is in the nearby list AND patient wants care within 2 weeks.
 * Everything else takes the standard path.
 *
 * @framerIntrinsicWidth 480
 * @framerIntrinsicHeight 640
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */

const TREATMENTS = {
    general: [
        "Checkup and cleaning",
        "Toothache or urgent issue",
        "Fillings or crowns",
        "Root canal",
        "Dentures or bridges",
        "Not sure yet",
    ],
    cosmetic: [
        "Teeth whitening",
        "Veneers",
        "Invisalign or clear aligners",
        "Bonding or gum contouring",
        "Full smile makeover",
        "Not sure yet",
    ],
}

const TIMING = [
    { v: "2weeks", l: "Within 2 weeks" },
    { v: "1to2months", l: "In 1 to 2 months" },
    { v: "exploring", l: "Just exploring" },
]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const TIMES = ["Morning", "Afternoon", "Evening"]

export default function BookingForm(props) {
    const { variant, practiceName, phone, endpoint, nearbyPrefixes, accent, ink, bg, priority } = props
    const [f, setF] = useState({
        treatment: "", name: "", email: "", phone: "", postal: "",
        timing: "", days: [], time: "", notes: "", consent: false,
    })
    const [status, setStatus] = useState("idle") // idle | sending | done | error
    const [touched, setTouched] = useState(false)

    const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
    const toggleDay = (d) => set("days", f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d])

    const prefixes = useMemo(
        () => nearbyPrefixes.split(",").map((s) => s.trim().toUpperCase().replace(/\s/g, "")).filter(Boolean),
        [nearbyPrefixes]
    )
    const fsa = f.postal.toUpperCase().replace(/\s/g, "").slice(0, 3)
    const isNearby = fsa.length === 3 && prefixes.includes(fsa)
    const isSoon = f.timing === "2weeks"
    const route = isNearby && isSoon ? "priority" : "standard"

    const errors = {
        treatment: !f.treatment,
        name: f.name.trim().length < 2,
        email: !/^\S+@\S+\.\S+$/.test(f.email),
        phone: f.phone.replace(/\D/g, "").length < 10,
        postal: fsa.length < 3,
        timing: !f.timing,
        consent: !f.consent,
    }
    const hasErrors = Object.values(errors).some(Boolean)

    async function submit(e) {
        e.preventDefault()
        setTouched(true)
        if (hasErrors) return
        setStatus("sending")
        try {
            if (endpoint) {
                const res = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ ...f, route, nearby: isNearby, page: variant, practice: practiceName }),
                })
                if (!res.ok) throw new Error("bad response")
            }
            setStatus("done")
        } catch {
            setStatus("error")
        }
    }

    const s = {
        wrap: { background: bg, color: ink, borderRadius: 20, padding: 28, boxSizing: "border-box" as const, width: "100%", fontFamily: "inherit" },
        label: { display: "block", fontSize: 14, fontWeight: 600, margin: "18px 0 6px" },
        input: (bad) => ({
            width: "100%", boxSizing: "border-box" as const, padding: "12px 14px", fontSize: 16, fontFamily: "inherit",
            color: ink, background: "#fff", borderRadius: 10, border: `1.5px solid ${touched && bad ? "#B3261E" : "#C9D3D0"}`,
        }),
        chip: (on) => ({
            padding: "10px 14px", borderRadius: 999, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
            border: `1.5px solid ${on ? ink : "#C9D3D0"}`, background: on ? ink : "#fff", color: on ? "#fff" : ink,
        }),
        err: { color: "#B3261E", fontSize: 13, marginTop: 4 },
    }
    const showErr = (k, msg) => (touched && errors[k] ? <div style={s.err} role="alert">{msg}</div> : null)

    if (status === "done") {
        return (
            <div style={s.wrap} role="status">
                <h3 style={{ margin: 0, fontSize: 26 }}>
                    {route === "priority" ? "You're in our priority queue" : "Request received"}
                </h3>
                <p style={{ fontSize: 17, lineHeight: 1.5 }}>
                    {route === "priority"
                        ? `Thanks, ${f.name.split(" ")[0]}. Because you're close by and want care soon, our team will call you within one business day with the earliest openings.`
                        : `Thanks, ${f.name.split(" ")[0]}. We'll email you appointment options within two business days.`}
                </p>
                {phone && <p style={{ fontSize: 15 }}>Need us sooner? Call <a href={`tel:${phone.replace(/\D/g, "")}`} style={{ color: ink, fontWeight: 600 }}>{phone}</a>.</p>}
            </div>
        )
    }

    return (
        <form style={s.wrap} onSubmit={submit} noValidate aria-label={`Book an appointment at ${practiceName}`}>
            <style>{`.bf-f:focus-visible{outline:3px solid ${accent};outline-offset:2px}`}</style>

            <label style={{ ...s.label, marginTop: 0 }} htmlFor="bf-treat">What brings you in?</label>
            <select id="bf-treat" className="bf-f" style={s.input(errors.treatment)} value={f.treatment} onChange={(e) => set("treatment", e.target.value)}>
                <option value="">Choose a treatment</option>
                {TREATMENTS[variant].map((t) => <option key={t}>{t}</option>)}
            </select>
            {showErr("treatment", "Choose what you're coming in for.")}

            <label style={s.label} htmlFor="bf-name">Full name</label>
            <input id="bf-name" className="bf-f" style={s.input(errors.name)} value={f.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
            {showErr("name", "Enter your full name.")}

            <label style={s.label} htmlFor="bf-email">Email</label>
            <input id="bf-email" type="email" className="bf-f" style={s.input(errors.email)} value={f.email} autoComplete="email" onChange={(e) => set("email", e.target.value)} />
            {showErr("email", "Enter a valid email address.")}

            <label style={s.label} htmlFor="bf-phone">Phone</label>
            <input id="bf-phone" type="tel" className="bf-f" style={s.input(errors.phone)} value={f.phone} autoComplete="tel" onChange={(e) => set("phone", e.target.value)} />
            {showErr("phone", "Enter a 10-digit phone number.")}

            <label style={s.label} htmlFor="bf-postal">Home postal code</label>
            <input id="bf-postal" className="bf-f" style={{ ...s.input(errors.postal), textTransform: "uppercase" }} value={f.postal} maxLength={7} autoComplete="postal-code" onChange={(e) => set("postal", e.target.value)} />
            {showErr("postal", "Enter your postal code.")}

            <div style={s.label} id="bf-when">When would you like treatment?</div>
            <div role="radiogroup" aria-labelledby="bf-when" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {TIMING.map((t) => (
                    <button type="button" key={t.v} role="radio" aria-checked={f.timing === t.v} className="bf-f" style={s.chip(f.timing === t.v)} onClick={() => set("timing", t.v)}>{t.l}</button>
                ))}
            </div>
            {showErr("timing", "Tell us when you'd like to be seen.")}

            {/* Conditional block: priority path */}
            {route === "priority" ? (
                <div style={{ marginTop: 20, padding: 16, borderRadius: 14, background: "#fff", borderLeft: `6px solid ${accent}` }}>
                    <strong>{priority}</strong>
                    <div style={{ ...s.label, marginTop: 14 }}>Days that work</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {DAYS.map((d) => (
                            <button type="button" key={d} aria-pressed={f.days.includes(d)} className="bf-f" style={s.chip(f.days.includes(d))} onClick={() => toggleDay(d)}>{d}</button>
                        ))}
                    </div>
                    <div style={s.label}>Best time of day</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {TIMES.map((t) => (
                            <button type="button" key={t} aria-pressed={f.time === t} className="bf-f" style={s.chip(f.time === t)} onClick={() => set("time", t)}>{t}</button>
                        ))}
                    </div>
                </div>
            ) : (
                f.timing && (
                    <>
                        <label style={s.label} htmlFor="bf-notes">Anything we should know? (optional)</label>
                        <textarea id="bf-notes" className="bf-f" rows={3} style={s.input(false)} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
                    </>
                )
            )}

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "20px 0 0", fontSize: 14, lineHeight: 1.4 }}>
                <input type="checkbox" className="bf-f" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} style={{ marginTop: 3 }} />
                I agree to be contacted about my appointment request.
            </label>
            {showErr("consent", "Please agree so we can contact you.")}

            <button type="submit" className="bf-f" disabled={status === "sending"} style={{
                marginTop: 22, width: "100%", padding: "15px 18px", fontSize: 17, fontWeight: 700, fontFamily: "inherit",
                color: "#fff", background: ink, border: "none", borderRadius: 12, cursor: "pointer",
            }}>
                {status === "sending" ? "Sending..." : route === "priority" ? "Request priority appointment" : "Request appointment"}
            </button>
            {status === "error" && <div style={s.err} role="alert">Something went wrong. Please call {phone || "our office"} to book.</div>}
        </form>
    )
}

BookingForm.defaultProps = {
    variant: "general",
    practiceName: "Your Dental Practice",
    phone: "(555) 555-0123",
    endpoint: "",
    nearbyPrefixes: "L2M,L2N,L2P,L2R,L2S,L2T,L2V,L2W",
    priority: "Priority scheduling: tell us when you're free and we'll hold the earliest opening.",
    accent: "#E8A33D",
    ink: "#12302C",
    bg: "#EEF4F2",
}

addPropertyControls(BookingForm, {
    variant: { type: ControlType.Enum, title: "Page type", options: ["general", "cosmetic"], optionTitles: ["General dentistry", "Cosmetic"] },
    practiceName: { type: ControlType.String, title: "Practice" },
    phone: { type: ControlType.String, title: "Phone" },
    endpoint: { type: ControlType.String, title: "Form endpoint", description: "Formspree, Make, Zapier or your own webhook URL" },
    nearbyPrefixes: { type: ControlType.String, title: "Nearby FSAs", description: "First 3 characters of postal codes counted as close, comma separated" },
    priority: { type: ControlType.String, title: "Priority text", displayTextArea: true },
    accent: { type: ControlType.Color, title: "Accent" },
    ink: { type: ControlType.Color, title: "Ink" },
    bg: { type: ControlType.Color, title: "Background" },
})
