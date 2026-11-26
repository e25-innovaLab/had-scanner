'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function SettingsForm() {
  const [saved, setSaved] = useState(false);

  return (
    <Card className="flex w-full flex-col items-start gap-6 self-stretch rounded-[16px] border border-[rgba(226,232,240,0.85)] bg-white/85 p-8 shadow-none backdrop-blur-[6px]">
      <CardHeader className="w-full gap-1 p-0">
        <CardTitle className="font-heading text-base font-bold text-[#0F172A]">
          Datos para el informe
        </CardTitle>
        <CardDescription>
          Se usan en esta sesión, en la portada del informe de barreras.
        </CardDescription>
      </CardHeader>
      <CardContent className="w-full p-0">
        <form
          className="flex w-full flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
        >
          <label className="block space-y-2">
            <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nombre
            </span>
            <Input
              name="nombre"
              placeholder="Nombre y apellido"
              autoComplete="name"
            />
          </label>
          <label className="block space-y-2">
            <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Institución
            </span>
            <Input name="institucion" placeholder="Escuela o instituto" />
          </label>
          <label className="block space-y-2">
            <span className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Correo
            </span>
            <Input
              name="correo"
              type="email"
              placeholder="nombre@correo.edu"
              autoComplete="email"
            />
          </label>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button type="submit" className="rounded-[12px] font-semibold">
              Guardar
            </Button>
            {saved ? (
              <p className="text-sm text-muted-foreground" role="status">
                ✓ Guardado para esta sesión.
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
