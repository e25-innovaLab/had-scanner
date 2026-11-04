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
    <Card>
      <CardHeader>
        <CardTitle>Datos para el informe</CardTitle>
        <CardDescription>
          Se usan en esta sesión, en la portada del informe de barreras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
        >
          <label className="block space-y-1.5 text-sm font-medium">
            Nombre
            <Input
              name="nombre"
              placeholder="Nombre y apellido"
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Institución
            <Input name="institucion" placeholder="Escuela o instituto" />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            Correo
            <Input
              name="correo"
              type="email"
              placeholder="nombre@correo.edu"
              autoComplete="email"
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button type="submit" className="h-10 px-4">
              Guardar
            </Button>
            {saved ? (
              <p className="text-sm text-success-foreground" role="status">
                Guardado para esta sesión.
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
