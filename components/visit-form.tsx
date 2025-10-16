"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, Download, Loader2, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type PermitType = "municipal" | "serviu" | "mop" | "edificio"

interface FormData {
  codigoProyecto: string
  nombreCliente: string
  nombreContacto: string
  fonoContacto: string
  latitud: string
  longitud: string
  diasConstruccion: string
  permisos: "si" | "no"
  tiposPermisos: PermitType[]
  fotoIngreso: File | null
  fotosRecorrido: File[]
  fotoSala: File | null
}

export function VisitForm() {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    codigoProyecto: "",
    nombreCliente: "",
    nombreContacto: "",
    fonoContacto: "",
    latitud: "",
    longitud: "",
    diasConstruccion: "",
    permisos: "no",
    tiposPermisos: [],
    fotoIngreso: null,
    fotosRecorrido: [],
    fotoSala: null,
  })

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleFileChange = (field: "fotoIngreso" | "fotoSala", file: File | null) => {
    setFormData((prev) => ({ ...prev, [field]: file }))
  }

  const handleRecorridoFiles = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files).slice(0, 3)
      setFormData((prev) => ({ ...prev, fotosRecorrido: fileArray }))
    }
  }

  const handlePermitTypeToggle = (type: PermitType) => {
    setFormData((prev) => ({
      ...prev,
      tiposPermisos: prev.tiposPermisos.includes(type)
        ? prev.tiposPermisos.filter((t) => t !== type)
        : [...prev.tiposPermisos, type],
    }))
  }

  const validateForm = (): boolean => {
    if (!formData.codigoProyecto || !formData.nombreCliente || !formData.nombreContacto) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive",
      })
      return false
    }

    const lat = Number.parseFloat(formData.latitud)
    const lng = Number.parseFloat(formData.longitud)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({
        title: "Coordenadas inválidas",
        description: "Por favor ingrese coordenadas válidas",
        variant: "destructive",
      })
      return false
    }

    if (!formData.fotoIngreso || !formData.fotoSala) {
      toast({
        title: "Fotos requeridas",
        description: "Debe subir al menos la foto de ingreso y sala",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const generatePDF = async () => {
    if (!validateForm()) return

    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          fotoIngreso: formData.fotoIngreso ? await fileToBase64(formData.fotoIngreso) : null,
          fotosRecorrido: await Promise.all(formData.fotosRecorrido.map((f) => fileToBase64(f))),
          fotoSala: formData.fotoSala ? await fileToBase64(formData.fotoSala) : null,
        }),
      })

      if (!response.ok) throw new Error("Error al generar PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `visita-tecnica-${formData.codigoProyecto}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "PDF generado",
        description: "El archivo se ha descargado correctamente",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocalización no disponible",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive",
      })
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6)
        const lng = position.coords.longitude.toFixed(6)

        setFormData((prev) => ({
          ...prev,
          latitud: lat,
          longitud: lng,
        }))

        toast({
          title: "Ubicación obtenida",
          description: "Las coordenadas se han actualizado correctamente",
        })
        setIsGettingLocation(false)
      },
      (error) => {
        let errorMessage = "No se pudo obtener la ubicación"

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Permiso de ubicación denegado"
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Ubicación no disponible"
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Tiempo de espera agotado"
        }

        toast({
          title: "Error de geolocalización",
          description: errorMessage,
          variant: "destructive",
        })
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  const googleMapsUrl =
    formData.latitud && formData.longitud
      ? `https://www.google.com/maps?q=${formData.latitud},${formData.longitud}`
      : ""

  const handleAddRecorridoPhoto = (file: File | null) => {
    if (file && formData.fotosRecorrido.length < 3) {
      setFormData((prev) => ({
        ...prev,
        fotosRecorrido: [...prev.fotosRecorrido, file],
      }))
    } else if (formData.fotosRecorrido.length >= 3) {
      toast({
        title: "Límite alcanzado",
        description: "Solo puedes agregar hasta 3 fotos de recorrido",
        variant: "destructive",
      })
    }
  }

  const handleRemoveRecorridoPhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fotosRecorrido: prev.fotosRecorrido.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información del Proyecto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código Proyecto *</Label>
              <Input
                id="codigo"
                placeholder="Ej: PRY-2025-001"
                value={formData.codigoProyecto}
                onChange={(e) => handleInputChange("codigoProyecto", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente">Nombre Cliente *</Label>
              <Input
                id="cliente"
                placeholder="Nombre del cliente"
                value={formData.nombreCliente}
                onChange={(e) => handleInputChange("nombreCliente", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contacto">Nombre Contacto *</Label>
              <Input
                id="contacto"
                placeholder="Persona de contacto"
                value={formData.nombreContacto}
                onChange={(e) => handleInputChange("nombreContacto", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fono">Fono Contacto</Label>
              <Input
                id="fono"
                placeholder="+56 9 1234 5678"
                value={formData.fonoContacto}
                onChange={(e) => handleInputChange("fonoContacto", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dias">Días Aproximados de Construcción</Label>
              <Input
                id="dias"
                type="number"
                min="1"
                placeholder="Ej: 15"
                value={formData.diasConstruccion}
                onChange={(e) => handleInputChange("diasConstruccion", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ubicación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={getGPSLocation}
            disabled={isGettingLocation}
            className="w-full bg-transparent"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Obteniendo ubicación...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Obtener Coordenadas Automáticamente
              </>
            )}
          </Button>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitud">Latitud (decimal) *</Label>
              <Input
                id="latitud"
                type="number"
                step="0.000001"
                placeholder="-33.437916"
                value={formData.latitud}
                onChange={(e) => handleInputChange("latitud", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitud">Longitud (decimal) *</Label>
              <Input
                id="longitud"
                type="number"
                step="0.000001"
                placeholder="-70.650641"
                value={formData.longitud}
                onChange={(e) => handleInputChange("longitud", e.target.value)}
              />
            </div>
          </div>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <MapPin className="h-4 w-4" />
              Ver en Google Maps
            </a>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>¿Requiere permisos? *</Label>
            <RadioGroup value={formData.permisos} onValueChange={(value) => handleInputChange("permisos", value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="si" id="permisos-si" />
                <Label htmlFor="permisos-si" className="font-normal cursor-pointer">
                  Sí
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="permisos-no" />
                <Label htmlFor="permisos-no" className="font-normal cursor-pointer">
                  No
                </Label>
              </div>
            </RadioGroup>
          </div>

          {formData.permisos === "si" && (
            <div className="space-y-2">
              <Label>Tipo de permisos</Label>
              <div className="space-y-2">
                {(["municipal", "serviu", "mop", "edificio"] as PermitType[]).map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`permiso-${type}`}
                      checked={formData.tiposPermisos.includes(type)}
                      onCheckedChange={() => handlePermitTypeToggle(type)}
                    />
                    <Label htmlFor={`permiso-${type}`} className="font-normal cursor-pointer capitalize">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotografías</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="foto-ingreso">Ingreso de FIBRA *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="foto-ingreso"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("fotoIngreso", e.target.files?.[0] || null)}
              />
              {formData.fotoIngreso && (
                <span className="text-sm text-muted-foreground">{formData.fotoIngreso.name}</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Recorrido de FIBRA (hasta 3 fotos)</Label>
              <span className="text-sm text-muted-foreground">{formData.fotosRecorrido.length}/3 fotos</span>
            </div>

            {/* Display added photos */}
            {formData.fotosRecorrido.length > 0 && (
              <div className="space-y-2">
                {formData.fotosRecorrido.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 p-3"
                  >
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRecorridoPhoto(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add photo button */}
            {formData.fotosRecorrido.length < 3 && (
              <div>
                <Input
                  id="add-recorrido-photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleAddRecorridoPhoto(file)
                      e.target.value = "" // Reset input
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("add-recorrido-photo")?.click()}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Foto de Recorrido
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="foto-sala">Sala donde llega FIBRA *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="foto-sala"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange("fotoSala", e.target.files?.[0] || null)}
              />
              {formData.fotoSala && <span className="text-sm text-muted-foreground">{formData.fotoSala.name}</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={generatePDF} disabled={isGenerating} size="lg" className="w-full">
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generando PDF...
          </>
        ) : (
          <>
            <Download className="mr-2 h-5 w-5" />
            Generar PDF
          </>
        )}
      </Button>
    </div>
  )
}
