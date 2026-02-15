import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { ChefPanel } from './ChefPanel';
import { ChefPlan, FamilyMember, Ingredient, Recipe, GoalType, Gender, ActivityLevel } from '../types';

// Mock Lucide icons to avoid rendering issues in tests
jest.mock('lucide-react', () => ({
  ChefHat: () => <div data-testid="icon-chef" />,
  ShoppingCart: () => <div data-testid="icon-cart" />,
  // ... mock other icons as needed or use a proxy
  CheckCircle: () => <button>Check</button>,
  PackagePlus: () => <button title="Есть дома (добавить в продукты)">Add</button>,
  // Fallback for others
  Clock: () => null,
  TrendingUp: () => null,
  Loader2: () => null,
  Send: () => null,
  Bookmark: () => null,
  Scale: () => null,
  Utensils: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  Sun: () => null,
  Moon: () => null,
  Coffee: () => null,
  Soup: () => null,
  CheckSquare: () => null,
  Square: () => null,
  User: () => null,
  Users: () => null,
  Copy: () => null,
  Star: () => null,
  Eye: () => null,
  EyeOff: () => null,
  Share2: () => null,
  Download: () => null,
  ExternalLink: () => null,
  Printer: () => null,
  Image: () => null,
  PlusCircle: () => null,
  StickyNote: () => null,
  Mail: () => null,
}));

const mockInventory: Ingredient[] = [];
const mockFamily: FamilyMember[] = [{ 
  id: '1', 
  name: 'Test User', 
  age: 30, 
  gender: Gender.MALE,
  height: 180,
  weight: 80,
  activityLevel: ActivityLevel.MODERATE,
  goal: GoalType.GENERAL_HEALTH, 
  preferences: '' 
}];

const mockPlan: ChefPlan = {
  summary: 'Test Plan Summary',
  recipes: [
    {
        name: 'Test Recipe',
        description: 'Desc',
        cookingTimeMinutes: 20,
        difficulty: 'Easy',
        ingredientsToUse: ['Egg'],
        missingIngredients: ['Milk'],
        healthBenefits: 'Good',
        weightPerServing: '300g',
        totalWeightForFamily: '1kg',
        caloriesPerServing: '500',
        protein: '20g',
        fats: '10g',
        carbs: '50g',
        instructions: ['Step 1'],
        mealType: ['Завтрак'],
        familySuitability: []
    }
  ],
  shoppingList: [
    { name: 'Milk', quantity: '1L', reason: 'Test Recipe' },
    { name: 'Bread', quantity: '1 Loaf', reason: 'Test Recipe' }
  ]
};

describe('ChefPanel Integration Tests', () => {
  
  it('renders the shopping list correctly from the plan', () => {
    render(
      <ChefPanel 
        inventory={mockInventory}
        setInventory={jest.fn()}
        family={mockFamily}
        onSaveRecipe={jest.fn()}
        savedRecipes={[]}
        plan={mockPlan}
        setPlan={jest.fn()}
        excludedShoppingItems={[]}
        setExcludedShoppingItems={jest.fn()}
      />
    );

    expect(screen.getByText('Milk')).toBeInTheDocument();
    expect(screen.getByText('1L')).toBeInTheDocument();
    expect(screen.getByText('Bread')).toBeInTheDocument();
  });

  it('adds item to inventory and excludes from list when "Have at Home" is clicked', () => {
    const setInventoryMock = jest.fn();
    const setExcludedMock = jest.fn();

    render(
      <ChefPanel 
        inventory={mockInventory}
        setInventory={setInventoryMock}
        family={mockFamily}
        onSaveRecipe={jest.fn()}
        savedRecipes={[]}
        plan={mockPlan}
        setPlan={jest.fn()}
        excludedShoppingItems={[]}
        setExcludedShoppingItems={setExcludedMock}
      />
    );

    // Simulate clicking "Have at home" on the first item (Milk)
    const addButtons = screen.getAllByTitle('Есть дома (добавить в продукты)');
    fireEvent.click(addButtons[0]);

    // Expect setInventory to be called to add the item
    expect(setInventoryMock).toHaveBeenCalled();
    // We expect the state updater function to be passed
    const inventoryUpdateFn = setInventoryMock.mock.calls[0][0];
    const newInventory = inventoryUpdateFn([]); // Simulate empty previous state
    expect(newInventory).toHaveLength(1);
    expect(newInventory[0].name).toBe('Milk');

    // Expect setExcludedShoppingItems to be called to cross it off
    expect(setExcludedMock).toHaveBeenCalled();
    const excludedUpdateFn = setExcludedMock.mock.calls[0][0];
    const newExcluded = excludedUpdateFn([]);
    expect(newExcluded).toContain('Milk');
  });

  it('does not duplicate item in inventory if it already exists', () => {
    const setInventoryMock = jest.fn();
    const existingInventory: Ingredient[] = [{ id: '123', name: 'Milk', category: 'dairy' }];

    render(
      <ChefPanel 
        inventory={existingInventory}
        setInventory={setInventoryMock}
        family={mockFamily}
        onSaveRecipe={jest.fn()}
        savedRecipes={[]}
        plan={mockPlan}
        setPlan={jest.fn()}
        excludedShoppingItems={[]}
        setExcludedShoppingItems={jest.fn()}
      />
    );

    const addButtons = screen.getAllByTitle('Есть дома (добавить в продукты)');
    fireEvent.click(addButtons[0]); // Click Milk

    expect(setInventoryMock).toHaveBeenCalled();
    const inventoryUpdateFn = setInventoryMock.mock.calls[0][0];
    const resultInventory = inventoryUpdateFn(existingInventory);
    
    // Should still be length 1 (no duplicates)
    expect(resultInventory).toHaveLength(1);
  });
});