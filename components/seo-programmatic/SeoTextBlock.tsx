type Props = {
  title?: string
  id?: string
  children: React.ReactNode
  className?: string
}

/**
 * Bloc texte SEO réutilisable (titres H2 + contenu riche).
 */
export function SeoTextBlock({ title, id, children, className = "" }: Props) {
  return (
    <section id={id} className={`mb-10 ${className}`}>
      {title ? (
        <h2 className="text-xl md:text-2xl font-bold text-[#0a0a0a] mb-4">{title}</h2>
      ) : null}
      <div className="text-[#171717] leading-relaxed space-y-4 text-base">{children}</div>
    </section>
  )
}
