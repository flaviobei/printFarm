'use client'

import { useState } from 'react'
import { login, signup } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Box } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: React.MouseEvent<HTMLButtonElement>, action: typeof login) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    
    const form = document.getElementById('auth-form') as HTMLFormElement
    const formData = new FormData(form)
    const result = await action(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <Box className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">printFarm SaaS</CardTitle>
          <CardDescription>
            Faça login para acessar o painel de produção da sua farm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="auth-form" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                className="w-full p-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">Senha</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="w-full p-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            {error && (
              <div className="p-3 text-sm bg-destructive/15 text-destructive rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault()
                  const form = document.getElementById('auth-form') as HTMLFormElement
                  if(form.checkValidity()) handleSubmit(e, login)
                  else form.reportValidity()
                }}
                className="w-full bg-primary text-primary-foreground p-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Aguarde...' : 'Entrar'}
              </button>
              
              <button 
                type="button" 
                disabled={isLoading}
                onClick={(e) => {
                  e.preventDefault()
                  const form = document.getElementById('auth-form') as HTMLFormElement
                  if(form.checkValidity()) handleSubmit(e, signup)
                  else form.reportValidity()
                }}
                className="w-full bg-secondary text-secondary-foreground p-2 rounded-md font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                Criar Conta
              </button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4 mt-4">
          <p className="text-xs text-muted-foreground">
            Ambiente seguro protegido por Supabase RLS
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
