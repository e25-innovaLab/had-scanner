import { SettingsForm } from '@/components/aula/settings-form';

export function ConfiguracionPage() {
  return (
    <div className="w-full space-y-6">
      <header className="space-y-2">
        <h1 className="font-heading text-[32px] leading-normal font-bold text-[#0F172A]">
          Configuración
        </h1>
        <p className="max-w-2xl text-[14px] leading-normal font-medium text-muted-foreground">
          Estás usando VERA sin cuenta. Estos datos no se conservan al cerrar la
          sesión.
        </p>
      </header>
      <SettingsForm />
    </div>
  );
}
