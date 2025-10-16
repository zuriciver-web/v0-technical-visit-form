import { type NextRequest, NextResponse } from "next/server"
import { jsPDF } from "jspdf"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    const pdf = new jsPDF("p", "mm", "a4")
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20

    // Título principal
    pdf.setFontSize(18)
    pdf.setFont("helvetica", "bold")
    pdf.text(`VISITA TÉCNICA PROYECTO: ${data.codigoProyecto}`, pageWidth / 2, 20, {
      align: "center",
    })

    // Línea separadora
    pdf.setLineWidth(0.5)
    pdf.line(margin, 28, pageWidth - margin, 28)

    // Información del proyecto en grilla
    pdf.setFontSize(10)
    pdf.setFont("helvetica", "normal")
    let yPos = 40

    const drawField = (label: string, value: string, x: number, y: number, width: number) => {
      pdf.setFont("helvetica", "bold")
      pdf.text(label, x, y)
      pdf.setFont("helvetica", "normal")
      pdf.text(value || "N/A", x, y + 5)

      // Borde del campo
      pdf.setDrawColor(200, 200, 200)
      pdf.rect(x - 2, y - 4, width, 12)
    }

    // Primera fila
    drawField("Código Proyecto:", data.codigoProyecto, margin, yPos, 85)
    drawField("Nombre Cliente:", data.nombreCliente, pageWidth / 2 + 5, yPos, 85)

    yPos += 18

    // Segunda fila
    drawField("Nombre Contacto:", data.nombreContacto, margin, yPos, 85)
    drawField("Fono Contacto:", data.fonoContacto, pageWidth / 2 + 5, yPos, 85)

    yPos += 18

    // Coordenadas
    const coordenadas = `${Number.parseFloat(data.latitud).toFixed(6)}, ${Number.parseFloat(data.longitud).toFixed(6)}`
    drawField("Coordenadas:", coordenadas, margin, yPos, 85)

    const mapsUrl = `https://maps.google.com/?q=${data.latitud},${data.longitud}`
    pdf.setTextColor(0, 0, 255)
    pdf.textWithLink("Ver en Google Maps", pageWidth / 2 + 5, yPos + 5, { url: mapsUrl })
    pdf.setTextColor(0, 0, 0)

    yPos += 18

    // Días Aprox. de Construcción
    if (data.diasConstruccion) {
      drawField("Días Aprox. de Construcción:", `${data.diasConstruccion} días`, margin, yPos, 85)
      yPos += 18
    }

    // Permisos
    drawField("Permisos:", data.permisos === "si" ? "Sí" : "No", margin, yPos, 85)

    if (data.permisos === "si" && data.tiposPermisos.length > 0) {
      const tipos = data.tiposPermisos.join(", ").toUpperCase()
      drawField("Tipo de Permisos:", tipos, pageWidth / 2 + 5, yPos, 85)
    }

    // Función para agregar imagen en nueva página
    const addImagePage = async (base64: string, title: string) => {
      pdf.addPage()

      // Título de la foto
      pdf.setFontSize(14)
      pdf.setFont("helvetica", "bold")
      pdf.text(title, pageWidth / 2, 20, { align: "center" })

      // Agregar imagen centrada
      try {
        const imgWidth = pageWidth - 2 * margin
        const imgHeight = pageHeight - 60

        pdf.addImage(base64, "JPEG", margin, 35, imgWidth, imgHeight, undefined, "FAST")
      } catch (error) {
        console.error("Error adding image:", error)
        pdf.setFontSize(10)
        pdf.text("Error al cargar la imagen", pageWidth / 2, pageHeight / 2, { align: "center" })
      }
    }

    // Agregar fotos
    if (data.fotoIngreso) {
      await addImagePage(data.fotoIngreso, "INGRESO DE FIBRA")
    }

    if (data.fotosRecorrido && data.fotosRecorrido.length > 0) {
      for (let i = 0; i < data.fotosRecorrido.length; i++) {
        await addImagePage(data.fotosRecorrido[i], `RECORRIDO DE FIBRA ${i + 1}`)
      }
    }

    if (data.fotoSala) {
      await addImagePage(data.fotoSala, "SALA DONDE LLEGA FIBRA")
    }

    // Generar PDF
    const pdfBuffer = pdf.output("arraybuffer")

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="visita-tecnica-${data.codigoProyecto}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Error al generar PDF" }, { status: 500 })
  }
}
