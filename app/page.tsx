import { VisitForm } from "@/components/visit-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Formulario de Visita Técnica</h1>
          <p className="text-muted-foreground">Complete todos los campos para generar el informe PDF</p>
        </div>
        <VisitForm />
      </div>
    </main>
  )
}
