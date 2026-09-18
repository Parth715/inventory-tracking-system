"use client"

export function printReceiptElement(
  elementId: string = "printable-combined-receipt",
) {
  if (typeof window === "undefined") return

  const el = document.getElementById(elementId)
  if (!el) {
    window.print()
    return
  }

  // Create an invisible iframe for isolated printing
  const iframe = document.createElement("iframe")
  iframe.style.position = "fixed"
  iframe.style.right = "0"
  iframe.style.bottom = "0"
  iframe.style.width = "0"
  iframe.style.height = "0"
  iframe.style.border = "0"
  iframe.style.visibility = "hidden"
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    window.print()
    return
  }

  // Collect all styles and stylesheets from parent document
  const headElements: string[] = []
  document.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
    headElements.push(node.outerHTML)
  })

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Combined Receipt Settlement Slip</title>
        ${headElements.join("\n")}
        <style>
          @page {
            margin: 0.4in;
            size: auto;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
          .print-area {
            box-shadow: none !important;
            border: 1px solid rgba(0, 0, 0, 0.2) !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 1.5rem !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .print-avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div style="width: 100%; max-width: 800px; margin: 0 auto;">
          ${el.outerHTML}
        </div>
      </body>
    </html>
  `)
  doc.close()

  // Wait briefly for all fonts & stylesheets to render
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch (e) {
      console.error("Iframe print error, falling back to window.print()", e)
      window.print()
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 3000)
    }
  }, 300)
}
