import { SettingsForm } from '@/components/aula/settings-form';

export function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Configuración
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
          Estás usando VERA sin cuenta. Estos datos no se conservan al cerrar la
          sesión.
        </p>
      </header>
      <SettingsForm />
    </div>
  );
}
