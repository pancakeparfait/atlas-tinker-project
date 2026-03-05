export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recipe Organizer</h1>
        <p className="text-muted-foreground">
          Welcome to your recipe organizer and meal planner
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Recipes</h2>
          <p className="text-muted-foreground mb-4">
            Organize and manage your favorite recipes
          </p>
          <div className="text-2xl font-bold text-primary">0</div>
          <p className="text-sm text-muted-foreground">Total recipes</p>
        </div>
        
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Meal Plans</h2>
          <p className="text-muted-foreground mb-4">
            Plan your weekly meals efficiently
          </p>
          <div className="text-2xl font-bold text-primary">0</div>
          <p className="text-sm text-muted-foreground">Active meal plans</p>
        </div>
        
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-2">Shopping Lists</h2>
          <p className="text-muted-foreground mb-4">
            Generate lists from your meal plans
          </p>
          <div className="text-2xl font-bold text-primary">0</div>
          <p className="text-sm text-muted-foreground">Pending lists</p>
        </div>
      </div>
      
      <div className="bg-card rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            Add Recipe
          </button>
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
            Create Meal Plan
          </button>
          <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 transition-colors">
            Browse Recipes
          </button>
        </div>
      </div>
    </div>
  )
}