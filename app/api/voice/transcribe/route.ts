import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

/**
 * POST /api/voice/transcribe
 *
 * Transkribiert eine Audio-Datei lokal mit faster-whisper (kein API-Key noetig).
 * Unterstuetzt: .oga, .ogg, .opus, .wav, .mp3, .m4a, .flac
 *
 * Request: multipart/form-data
 *   - file: Audio-Datei (required)
 *   - language: Sprachcode z.B. "de", "en" (optional, auto-detect wenn weggelassen)
 *
 * Response: { text, language, language_probability, duration, segments }
 */
export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const language = formData.get('language') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'Kein Audio-File angegeben. Bitte "file" als FormData-Feld senden.' },
        { status: 400 }
      )
    }

    // Save uploaded file to temp directory
    const tmpDir = os.tmpdir()
    const originalExt = path.extname(file.name) || '.oga'
    const tempName = `vemo-voice-${Date.now()}${originalExt}`
    tempFilePath = path.join(tmpDir, tempName)

    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // Call Python transcription script
    const scriptPath = path.join(process.cwd(), 'scripts', 'transcribe.py')
    const args = [scriptPath, tempFilePath]
    if (language) args.push(language)

    const result = await runPythonScript(args)

    if (result.error) {
      return NextResponse.json(
        { error: result.error, details: result.traceback },
        { status: 500 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Fehler beim Transkribieren', details: error?.message },
      { status: 500 }
    )
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath)
      } catch {}
    }
  }
}

function runPythonScript(args: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', args, {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number) => {
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`Python-Script fehlgeschlagen (exit ${code}): ${stderr}`))
        return
      }
      try {
        const parsed = JSON.parse(stdout.trim())
        resolve(parsed)
      } catch {
        reject(new Error(`Ungueltige JSON-Ausgabe vom Script: ${stdout.slice(0, 200)}`))
      }
    })

    proc.on('error', (err: Error) => {
      reject(new Error(`Konnte python3 nicht starten: ${err.message}`))
    })
  })
}
