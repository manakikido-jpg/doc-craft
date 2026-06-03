'use client'
import { ReactNode, ComponentType } from 'react'

type ProviderWithProps = [ComponentType<{ children: ReactNode }>, Record<string, any>?]

export type { ProviderWithProps }

export function ComposeProviders({
  providers,
  children,
}: {
  providers: ProviderWithProps[]
  children: ReactNode
}) {
  return providers.reduceRight<ReactNode>(
    (acc, [Provider, props]) => <Provider {...(props || {})}>{acc}</Provider>,
    children,
  )
}
