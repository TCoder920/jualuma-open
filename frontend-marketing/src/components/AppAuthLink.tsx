'use client'

import { type AnchorHTMLAttributes } from 'react'
import { APP_URL } from '@/lib/constants'

type AppAuthLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  appPath: string
}

const toAppHref = (appPath: string): string => new URL(appPath, APP_URL).toString()

export const AppAuthLink = ({ appPath, ...props }: AppAuthLinkProps) => {
  return <a {...props} href={toAppHref(appPath)} />
}
