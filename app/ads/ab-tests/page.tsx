'use client'

import { useState, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

type VariantMetrics = {
  impressions: number
  clicks: number
  conversions: number
  spend: number
  revenue: number
  ctr: number
  cpa: number
  roas: number
}

type ABTestVariant = {
  id: string
  label: string
  adId: string | null
  status: string
  metrics: VariantMetrics
}

type ABTest = {
  id: string
  name: string
  adId: string | null
  status: 'active' | 'paused' | 'completed'
  trafficSplit: number[]
  startDate: string
  endDate: string | null
  winner: string | null
  confidenceLevel: number | null
  recommendation: string | null
  variants: ABTestVariant[]
  createdAt: string
}

// ─── Mock ads for the dropdown ────────────────────────────────────────────────

const MOCK_ADS = [
  { id: 'mock-c1', name: 'Instagram Frühjahr 2026' },
  { id: 'mock-c2', name: 'Facebook Retargeting' },
  { id: 'mock-c3', name: 'Google Search Vemo' },
  { id: 'mock-c4', name: 'Facebook Brand Awareness' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return n.toLocaleString('de-CH')
}

function fmtCHF(n: number) {
  return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function statusBadge(status: ABTest['status']) {
  const colorMap: Record<string, string> = {
    active: 'bg-vemo-green-100 text-vemo-green-700 border-vemo-green-200',
    paused: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  const labelMap: Record<string, string> = {
    active: 'Aktiv',
    paused: 'Pausiert',
    completed: 'Abgeschlossen',
  }
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
        colorMap[status] ?? 'bg-gray-100 text-gray-700 border-gray-200'
      }`}
    >
      {labelMap[status] ?? status}
    </span>
  )
}

// ─── Wizard form state ────────────────────────────────────────────────────────

type WizardForm = {
  name: string
  adId: string
  variantCount: number
  splitMode: 'equal' | 'custom'
  customSplits: number[]
  durationDays: number
}

const defaultForm = (): WizardForm => ({
  name: '',
  adId: '',
  variantCount: 2,
  splitMode: 'equal',
  customSplits: [50, 50, 0, 0],
  durationDays: 14,
})

// ─── Metric Cell ──────────────────────────────────────────────────────────────

function MetricCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-xs text-vemo-dark-500 mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-vemo-dark-900">{value}</div>
    </div>
  )
}

// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({
  test,
  onScaleWinner,
  onPauseLoser,
  onDuplicate,
}: {
  test: ABTest
  onScaleWinner: () => void
  onPauseLoser: () => void
  onDuplicate: () => void
}) {
  const hasWinner = !!test.winner
  const showActionButtons = test.status === 'active' && hasWinner

  const dotColors = ['bg-blue-400', 'bg-vemo-green-400', 'bg-purple-400', 'bg-orange-400']

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-vemo-dark-100 flex flex-wrap items-start gap-3 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-vemo-dark-900 truncate">{test.name}</h3>
            {statusBadge(test.status)}
          </div>
          <div className="text-xs text-vemo-dark-500 mt-0.5">
            Start: {fmtDate(test.startDate)}
            {test.endDate && ` · Ende: ${fmtDate(test.endDate)}`}
            {' · '}{test.variants.length} Varianten
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {showActionButtons && (
            <>
              <button
                onClick={onScaleWinner}
                className="text-xs px-3 py-1.5 rounded-lg bg-vemo-green-500 text-white font-semibold hover:bg-vemo-green-600 transition-colors"
              >
                📈 Gewinner skalieren
              </button>
              <button
                onClick={onPauseLoser}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
              >
                ⏸ Verlierer pausieren
              </button>
            </>
          )}
          <button
            onClick={onDuplicate}
            className="text-xs px-3 py-1.5 rounded-lg border border-vemo-dark-200 text-vemo-dark-600 hover:border-vemo-dark-400 font-medium transition-colors"
          >
            ⎘ Duplizieren
          </button>
        </div>
      </div>

      {/* Traffic split bar */}
      <div className="px-4 pt-3 pb-0">
        <div className="text-xs text-vemo-dark-500 mb-1">Traffic-Aufteilung</div>
        <div className="flex rounded-full overflow-hidden h-2 gap-0.5">
          {test.variants.map((v, i) => {
            const pct = test.trafficSplit[i] ?? Math.round(100 / test.variants.length)
            return (
              <div
                key={v.id}
                className={`${dotColors[i]} transition-all`}
                style={{ width: `${pct}%` }}
                title={`${v.label}: ${pct} %`}
              />
            )
          })}
        </div>
        <div className="flex gap-4 mt-1.5 flex-wrap">
          {test.variants.map((v, i) => {
            const pct = test.trafficSplit[i] ?? Math.round(100 / test.variants.length)
            return (
              <span key={v.id} className="flex items-center gap-1 text-xs text-vemo-dark-500">
                <span className={`inline-block w-2 h-2 rounded-full ${dotColors[i]}`} />
                {v.label}: {pct} %
              </span>
            )
          })}
        </div>
      </div>

      {/* Variants */}
      <div className="p-4 space-y-3">
        {test.variants.map((variant) => {
          const isWinner = variant.id === test.winner
          const isLoser =
            !!test.winner && variant.id !== test.winner && test.status === 'completed'

          return (
            <div
              key={variant.id}
              className={`rounded-xl border p-3 transition-colors ${
                isWinner
                  ? 'border-vemo-green-300 bg-vemo-green-50'
                  : isLoser
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-vemo-dark-200 bg-white'
              }`}
            >
              {/* Variant header */}
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-vemo-dark-900">
                    Variante {variant.label}
                  </span>
                  {isWinner && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-vemo-green-500 text-white font-semibold">
                      🏆 Gewinner
                    </span>
                  )}
                  {isLoser && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 font-semibold">
                      Verlierer
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs font-bold ${
                    isWinner
                      ? 'text-vemo-green-600'
                      : isLoser
                      ? 'text-red-500'
                      : 'text-vemo-dark-500'
                  }`}
                >
                  ROAS {variant.metrics.roas.toFixed(2)}x
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <MetricCell label="Impressionen" value={fmtNum(variant.metrics.impressions)} />
                <MetricCell label="Klicks" value={fmtNum(variant.metrics.clicks)} />
                <MetricCell label="Conversions" value={variant.metrics.conversions} />
                <MetricCell label="CTR" value={`${variant.metrics.ctr.toFixed(2)} %`} />
                <MetricCell label="CPA" value={fmtCHF(variant.metrics.cpa)} />
                <MetricCell label="Ausgaben" value={fmtCHF(variant.metrics.spend)} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Confidence + Recommendation */}
      {(test.confidenceLevel !== null || test.recommendation) && (
        <div className="px-4 pb-4 space-y-3">
          {test.confidenceLevel !== null && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-vemo-dark-500 font-medium">Statistische Konfidenz</span>
                <span
                  className={`font-bold ${
                    test.confidenceLevel >= 95
                      ? 'text-vemo-green-600'
                      : test.confidenceLevel >= 80
                      ? 'text-yellow-600'
                      : 'text-vemo-dark-500'
                  }`}
                >
                  {test.confidenceLevel} %
                </span>
              </div>
              <div className="h-2 bg-vemo-dark-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    test.confidenceLevel >= 95
                      ? 'bg-vemo-green-500'
                      : test.confidenceLevel >= 80
                      ? 'bg-yellow-400'
                      : 'bg-vemo-dark-300'
                  }`}
                  style={{ width: `${test.confidenceLevel}%` }}
                />
              </div>
              <div className="text-xs text-vemo-dark-400 mt-0.5">
                {test.confidenceLevel >= 95
                  ? 'Statistisch signifikant — Entscheidung empfohlen'
                  : test.confidenceLevel >= 80
                  ? 'Tendenz erkennbar — weiter beobachten'
                  : 'Noch nicht aussagekräftig — mehr Daten benötigt'}
              </div>
            </div>
          )}
          {test.recommendation && (
            <div className="bg-vemo-dark-50 rounded-xl p-3 text-xs text-vemo-dark-700 border border-vemo-dark-100">
              <span className="font-semibold text-vemo-dark-900">💡 Empfehlung: </span>
              {test.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ABTestManagerPage() {
  const [tests, setTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(true)
  const [isMock, setIsMock] = useState(false)

  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [form, setForm] = useState<WizardForm>(defaultForm())
  const [saving, setSaving] = useState(false)
  const [wizardError, setWizardError] = useState<string | null>(null)

  useEffect(() => {
    loadTests()
  }, [])

  async function loadTests() {
    setLoading(true)
    try {
      const res = await fetch('/api/ads/ab-tests')
      const data = await res.json()
      setTests(data.tests ?? [])
      setIsMock(data.isMock ?? false)
    } finally {
      setLoading(false)
    }
  }

  // ── Wizard helpers ──────────────────────────────────────────────────────────

  function openWizard() {
    setForm(defaultForm())
    setWizardStep(1)
    setWizardError(null)
    setShowWizard(true)
  }

  function handleVariantCountChange(n: number) {
    const eq = Math.round(100 / n)
    const splits = Array(4).fill(0).map((_, i) => (i < n ? eq : 0))
    setForm({ ...form, variantCount: n, customSplits: splits })
  }

  function handleCustomSplit(idx: number, val: string) {
    const splits = [...form.customSplits]
    splits[idx] = Number(val)
    setForm({ ...form, customSplits: splits })
  }

  function effectiveSplits(): number[] {
    if (form.splitMode === 'equal') {
      const eq = Math.round(100 / form.variantCount)
      return Array(form.variantCount).fill(eq)
    }
    return form.customSplits.slice(0, form.variantCount)
  }

  function splitTotal() {
    return effectiveSplits().reduce((a, b) => a + b, 0)
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      setWizardError('Bitte einen Testnamen eingeben.')
      return
    }
    if (form.splitMode === 'custom' && Math.abs(splitTotal() - 100) > 2) {
      setWizardError(`Traffic-Aufteilung ergibt ${splitTotal()} % — muss 100 % ergeben.`)
      return
    }
    setSaving(true)
    setWizardError(null)
    try {
      const res = await fetch('/api/ads/ab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          adId: form.adId || null,
          variantCount: form.variantCount,
          trafficSplit: effectiveSplits(),
          durationDays: form.durationDays,
        }),
      })
      if (res.ok) {
        setShowWizard(false)
        await loadTests()
      } else {
        const data = await res.json()
        setWizardError(data.error ?? 'Fehler beim Erstellen.')
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Action handlers ─────────────────────────────────────────────────────────

  function handleScaleWinner(test: ABTest) {
    const winner = test.variants.find((v) => v.id === test.winner)
    alert(
      `📈 Gewinner-Variante «${winner?.label ?? '?'}» von «${test.name}» wird skaliert.\n\nIn der Produktion: Budget des Gewinners verdoppeln und Verlierer pausieren.`,
    )
  }

  function handlePauseLoser(test: ABTest) {
    const loser = test.variants.find((v) => v.id !== test.winner)
    alert(`⏸ Verlierer-Variante «${loser?.label ?? '?'}» von «${test.name}» wird pausiert.`)
  }

  function handleDuplicate(test: ABTest) {
    setForm({ ...defaultForm(), name: `${test.name} (Kopie)`, adId: test.adId ?? '' })
    setWizardStep(1)
    setWizardError(null)
    setShowWizard(true)
  }

  // ── Derived stats ───────────────────────────────────────────────────────────

  const activeTests = tests.filter((t) => t.status === 'active')
  const completedTests = tests.filter((t) => t.status === 'completed')
  const pausedTests = tests.filter((t) => t.status === 'paused')
  const totalVariants = tests.reduce((sum, t) => sum + t.variants.length, 0)

  const bestRoasImprovement = completedTests.reduce((best, t) => {
    if (!t.winner) return best
    const winner = t.variants.find((v) => v.id === t.winner)
    const loser = t.variants.find((v) => v.id !== t.winner)
    if (!winner || !loser || loser.metrics.roas === 0) return best
    const pct = ((winner.metrics.roas - loser.metrics.roas) / loser.metrics.roas) * 100
    return pct > best ? pct : best
  }, 0)

  const VARIANT_LABELS = ['A', 'B', 'C', 'D']

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-2xl">🧪</span>
            <h1 className="text-2xl font-bold text-vemo-dark-900">A/B Test Manager</h1>
            {isMock && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-200">
                🔌 API-Stub (Mock-Daten)
              </span>
            )}
          </div>
          <p className="text-vemo-dark-500 text-sm">
            Anzeigen-Varianten testen, auswerten und automatisch skalieren
          </p>
          {isMock && (
            <p className="text-xs text-blue-500 mt-1">
              Sobald{' '}
              <code className="bg-blue-50 px-1 rounded">META_ADS_TOKEN</code> oder{' '}
              <code className="bg-blue-50 px-1 rounded">GOOGLE_ADS_TOKEN</code> gesetzt ist, werden echte Daten geladen.
            </p>
          )}
        </div>
        <button onClick={openWizard} className="btn-primary text-sm flex-shrink-0">
          + Neuer Test
        </button>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Aktive Tests', value: activeTests.length, icon: '▶️' },
          { label: 'Abgeschlossen', value: completedTests.length, icon: '✅' },
          { label: 'Varianten gesamt', value: totalVariants, icon: '🔀' },
          {
            label: 'Bester ROAS-Gewinn',
            value: bestRoasImprovement > 0
              ? `+${Math.round(bestRoasImprovement)} %`
              : '—',
            icon: '🚀',
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-xl font-bold text-vemo-dark-900">{value}</div>
            <div className="text-xs text-vemo-dark-500">{label}</div>
          </div>
        ))}
      </div>

      {/* ── New Test Wizard ────────────────────────────────────────────────────── */}
      {showWizard && (
        <div className="card p-5 border-2 border-vemo-green-300">
          {/* Wizard header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-vemo-dark-900 uppercase tracking-wider">
              Neuer A/B Test — Schritt {wizardStep} / 3
            </h2>
            <button
              onClick={() => setShowWizard(false)}
              className="text-vemo-dark-400 hover:text-vemo-dark-700 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Step progress bar */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  s <= wizardStep ? 'bg-vemo-green-500' : 'bg-vemo-dark-200'
                }`}
              />
            ))}
          </div>

          {/* ── Step 1: Name + Ad ── */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">
                  Testname *
                </label>
                <input
                  className="input w-full text-sm"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="z. B. «Headline-Test März 2026»"
                  autoFocus
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-vemo-dark-700 block mb-1">
                  Anzeige / Kampagne verknüpfen (optional)
                </label>
                <select
                  className="input w-full text-sm"
                  value={form.adId}
                  onChange={(e) => setForm({ ...form, adId: e.target.value })}
                >
                  <option value="">— Keine Verknüpfung —</option>
                  {MOCK_ADS.map((ad) => (
                    <option key={ad.id} value={ad.id}>{ad.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: Variants + Traffic Split ── */}
          {wizardStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-vemo-dark-700 block mb-2">
                  Anzahl Varianten
                </label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => handleVariantCountChange(n)}
                      className={`w-12 h-10 rounded-lg border text-sm font-semibold transition-colors ${
                        form.variantCount === n
                          ? 'bg-vemo-green-500 text-white border-vemo-green-500'
                          : 'bg-white text-vemo-dark-700 border-vemo-dark-300 hover:border-vemo-dark-500'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-vemo-dark-700 block mb-2">
                  Traffic-Aufteilung
                </label>
                <div className="flex gap-2 mb-3">
                  {(['equal', 'custom'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setForm({ ...form, splitMode: mode })}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        form.splitMode === mode
                          ? 'bg-vemo-dark-900 text-white border-vemo-dark-900'
                          : 'bg-white text-vemo-dark-600 border-vemo-dark-200 hover:border-vemo-dark-400'
                      }`}
                    >
                      {mode === 'equal' ? 'Gleichmässig' : 'Benutzerdefiniert'}
                    </button>
                  ))}
                </div>

                {form.splitMode === 'equal' ? (
                  <div className="flex gap-2">
                    {Array(form.variantCount).fill(0).map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 text-center p-2 bg-vemo-dark-50 rounded-lg border border-vemo-dark-200"
                      >
                        <div className="text-xs text-vemo-dark-500 mb-0.5">
                          Variante {VARIANT_LABELS[i]}
                        </div>
                        <div className="text-sm font-bold text-vemo-dark-900">
                          {Math.round(100 / form.variantCount)} %
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array(form.variantCount).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-vemo-dark-700 w-16">
                          Variante {VARIANT_LABELS[i]}
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input text-sm w-20 text-center"
                          value={form.customSplits[i]}
                          onChange={(e) => handleCustomSplit(i, e.target.value)}
                        />
                        <span className="text-xs text-vemo-dark-500">%</span>
                      </div>
                    ))}
                    <div
                      className={`text-xs font-semibold mt-1 ${
                        Math.abs(splitTotal() - 100) > 2 ? 'text-red-600' : 'text-vemo-green-600'
                      }`}
                    >
                      Gesamt: {splitTotal()} %{' '}
                      {Math.abs(splitTotal() - 100) <= 2
                        ? '✓'
                        : '(muss 100 % ergeben)'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Duration + Confirm ── */}
          {wizardStep === 3 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-vemo-dark-700 block mb-2">
                  Testdauer
                </label>
                <div className="flex gap-2">
                  {[7, 14, 30].map((days) => (
                    <button
                      key={days}
                      onClick={() => setForm({ ...form, durationDays: days })}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        form.durationDays === days
                          ? 'bg-vemo-green-500 text-white border-vemo-green-500'
                          : 'bg-white text-vemo-dark-700 border-vemo-dark-300 hover:border-vemo-dark-500'
                      }`}
                    >
                      {days} Tage
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-vemo-dark-50 rounded-xl p-4 space-y-1.5 text-sm border border-vemo-dark-100">
                <div className="text-xs font-bold text-vemo-dark-700 uppercase tracking-wider mb-2">
                  Zusammenfassung
                </div>
                <div className="flex justify-between">
                  <span className="text-vemo-dark-500">Name</span>
                  <span className="font-semibold text-vemo-dark-900 text-right max-w-xs truncate">
                    {form.name || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vemo-dark-500">Anzeige</span>
                  <span className="font-semibold text-vemo-dark-900">
                    {MOCK_ADS.find((a) => a.id === form.adId)?.name ?? 'Keine Verknüpfung'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vemo-dark-500">Varianten</span>
                  <span className="font-semibold text-vemo-dark-900">
                    {form.variantCount} ({VARIANT_LABELS.slice(0, form.variantCount).join(', ')})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vemo-dark-500">Traffic</span>
                  <span className="font-semibold text-vemo-dark-900 text-right">
                    {effectiveSplits()
                      .map((s, i) => `${VARIANT_LABELS[i]}: ${s} %`)
                      .join(' · ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-vemo-dark-500">Dauer</span>
                  <span className="font-semibold text-vemo-dark-900">{form.durationDays} Tage</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {wizardError && (
            <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {wizardError}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-5 flex-wrap">
            {wizardStep > 1 && (
              <button
                onClick={() => {
                  setWizardStep(wizardStep - 1)
                  setWizardError(null)
                }}
                className="btn-outline text-sm"
              >
                ← Zurück
              </button>
            )}
            {wizardStep < 3 ? (
              <button
                onClick={() => {
                  if (wizardStep === 1 && !form.name.trim()) {
                    setWizardError('Bitte einen Testnamen eingeben.')
                    return
                  }
                  setWizardError(null)
                  setWizardStep(wizardStep + 1)
                }}
                className="btn-primary text-sm"
              >
                Weiter →
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={saving}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {saving ? 'Wird erstellt...' : '✓ Test starten'}
              </button>
            )}
            <button
              onClick={() => setShowWizard(false)}
              className="btn-outline text-sm ml-auto"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────────── */}
      {loading && (
        <div className="card p-8 text-center text-sm text-vemo-dark-500">
          Lade A/B Tests...
        </div>
      )}

      {/* ── Active Tests ──────────────────────────────────────────────────────── */}
      {!loading && activeTests.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-vemo-dark-700 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-vemo-green-500" />
            Aktive Tests ({activeTests.length})
          </h2>
          {activeTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onScaleWinner={() => handleScaleWinner(test)}
              onPauseLoser={() => handlePauseLoser(test)}
              onDuplicate={() => handleDuplicate(test)}
            />
          ))}
        </section>
      )}

      {/* ── Paused Tests ──────────────────────────────────────────────────────── */}
      {!loading && pausedTests.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-vemo-dark-700 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" />
            Pausierte Tests ({pausedTests.length})
          </h2>
          {pausedTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onScaleWinner={() => handleScaleWinner(test)}
              onPauseLoser={() => handlePauseLoser(test)}
              onDuplicate={() => handleDuplicate(test)}
            />
          ))}
        </section>
      )}

      {/* ── Completed Tests ───────────────────────────────────────────────────── */}
      {!loading && completedTests.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-vemo-dark-700 uppercase tracking-wider flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
            Abgeschlossene Tests ({completedTests.length})
          </h2>
          {completedTests.map((test) => (
            <TestCard
              key={test.id}
              test={test}
              onScaleWinner={() => handleScaleWinner(test)}
              onPauseLoser={() => handlePauseLoser(test)}
              onDuplicate={() => handleDuplicate(test)}
            />
          ))}
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────────── */}
      {!loading && tests.length === 0 && (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🧪</div>
          <div className="text-vemo-dark-700 font-semibold mb-1">
            Noch keine A/B Tests vorhanden
          </div>
          <div className="text-sm text-vemo-dark-500 mb-4">
            Erstelle deinen ersten Test, um Anzeigen-Varianten zu vergleichen.
          </div>
          <button onClick={openWizard} className="btn-primary text-sm">
            + Ersten Test erstellen
          </button>
        </div>
      )}

      {/* ── API Integration Info ───────────────────────────────────────────────── */}
      <div className="card p-5 bg-blue-50/50 border border-blue-200">
        <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-2">
          🔌 API-Integration vorbereitet
        </h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p>
            • <strong>Meta Ads:</strong>{' '}
            <code className="bg-blue-100 px-1 rounded">META_ADS_TOKEN</code> +{' '}
            <code className="bg-blue-100 px-1 rounded">META_ADS_ACCOUNT_ID</code> setzen → echte Variantendaten
          </p>
          <p>
            • <strong>Google Ads:</strong>{' '}
            <code className="bg-blue-100 px-1 rounded">GOOGLE_ADS_TOKEN</code> setzen → automatische Auswertung
          </p>
          <p>
            • <strong>Auto-Scaling:</strong> Cron-Job unter{' '}
            <code className="bg-blue-100 px-1 rounded">/api/cron/evaluate-ab-tests</code> aktivieren
          </p>
        </div>
      </div>

    </div>
  )
}
