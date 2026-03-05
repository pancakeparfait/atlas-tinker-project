export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">Recipe Organizer</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <span className="text-sm text-muted-foreground">
          Welcome to your kitchen companion
        </span>
      </div>
    </header>
  )
}