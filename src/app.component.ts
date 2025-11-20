
import { Component, ChangeDetectionStrategy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

// --- Data Interfaces ---
export interface User {
  id: string;
  name: string;
  grade: number;
  department: string;
  role: 'employee' | 'admin';
  quarterlyCap: number;
  password?: string; // In a real app, this would be hashed
}

export interface Category {
  id: number;
  name: string;
  isClientExpense: boolean;
  limit: number;
}

export interface Claim {
  id: number;
  employeeId: string;
  description: string;
  amount: number;
  date: string;
  categoryId: number;
  status: 'Pending' | 'Approved' | 'Declined';
  billUrl?: string;
  riskScore: number;
  policyViolations: string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule],
})
export class AppComponent {
  // --- STATE MANAGEMENT (SIGNALS) ---
  
  // View state
  currentView = signal<'login' | 'employee' | 'admin'>('login');
  loggedInUser = signal<User | null>(null);
  adminSelectedTab = signal<'approvals' | 'employees' | 'insights' | 'policy'>('approvals');
  
  // Login form state
  loginId = signal('');
  loginPassword = signal('');
  loginError = signal('');

  // New Expense form state
  newExpenseDescription = signal('');
  newExpenseAmount = signal<number | null>(null);
  newExpenseDate = signal(new Date().toISOString().split('T')[0]);
  newExpenseCategory = signal<number | null>(null);
  newExpenseBill = signal<File | null>(null);
  newExpenseFileName = signal('');
  newExpenseSubmitting = signal(false);
  newExpenseAiSuggestion = signal('');
  newExpensePolicyViolations = signal<string[]>([]);
  
  // --- MOCK DATABASE ---
  
  users = signal<User[]>([
    { id: 'E1001', name: 'Rahul Sharma', grade: 1, department: 'Finance', role: 'employee', quarterlyCap: 10000, password: 'pass123' },
    { id: 'E1002', name: 'Priya Verma', grade: 2, department: 'Marketing', role: 'employee', quarterlyCap: 25000, password: 'pass123' },
    { id: 'E1003', name: 'Amit Singh', grade: 3, department: 'Human Resource', role: 'employee', quarterlyCap: 30000, password: 'pass123' },
    { id: 'A2001', name: 'Neha Gupta', grade: 4, department: 'Administration', role: 'admin', quarterlyCap: 40000, password: 'admin123' },
    { id: 'A2002', name: 'Karan Patel', grade: 5, department: 'Client Entertainment', role: 'admin', quarterlyCap: 65000, password: 'admin123' }
  ]);
  
  categories = signal<Category[]>([
    { id: 1, name: 'Travel', isClientExpense: false, limit: 5000 },
    { id: 2, name: 'Meals & Hospitality', isClientExpense: false, limit: 3000 },
    { id: 3, name: 'Training', isClientExpense: false, limit: 10000 },
    { id: 4, name: 'Office / Admin', isClientExpense: false, limit: 2000 },
    { id: 5, name: 'Miscellaneous', isClientExpense: false, limit: 1500 },
    { id: 6, name: 'Client Entertainment', isClientExpense: true, limit: 15000 },
    { id: 7, name: 'Client Events', isClientExpense: true, limit: 20000 },
    { id: 8, name: 'Advertising / Events', isClientExpense: false, limit: 8000 }
  ]);
  
  claims = signal<Claim[]>([
    { id: 1, employeeId: 'E1001', description: 'Train ticket to Mumbai', amount: 2500, date: '2024-07-15', categoryId: 1, status: 'Approved', riskScore: 10, policyViolations: [] },
    { id: 2, employeeId: 'E1002', description: 'Team lunch', amount: 4500, date: '2024-07-10', categoryId: 2, status: 'Declined', riskScore: 30, policyViolations: ['Exceeded category limit'] },
    { id: 3, employeeId: 'A2001', description: 'Client dinner meeting', amount: 8000, date: '2024-07-20', categoryId: 6, status: 'Pending', riskScore: 25, policyViolations: [] },
    { id: 4, employeeId: 'E1003', description: 'Online course subscription', amount: 7500, date: '2024-08-01', categoryId: 3, status: 'Pending', riskScore: 15, policyViolations: [] },
    { id: 5, employeeId: 'A2002', description: 'Sponsored tech conference', amount: 22000, date: '2024-08-05', categoryId: 7, status: 'Pending', riskScore: 65, policyViolations: [] }
  ]);

  // --- COMPUTED SIGNALS ---

  // Employee-specific computed signals
  userClaims = computed(() => {
    const user = this.loggedInUser();
    if (!user) return [];
    return this.claims().filter(c => c.employeeId === user.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  availedAmount = computed(() => {
    const user = this.loggedInUser();
    if (!user) return 0;
    return this.userClaims()
      .filter(c => c.status === 'Approved' || c.status === 'Pending')
      .reduce((sum, c) => sum + c.amount, 0);
  });

  remainingAmount = computed(() => {
    const user = this.loggedInUser();
    if (!user) return 0;
    return user.quarterlyCap - this.availedAmount();
  });

  eligibleCategories = computed(() => {
    const user = this.loggedInUser();
    if (!user) return [];
    if (user.grade >= 4) {
      return this.categories();
    }
    return this.categories().filter(c => !c.isClientExpense);
  });

  // Admin-specific computed signals
  pendingClaims = computed(() => this.claims().filter(c => c.status === 'Pending'));
  allClaimsSorted = computed(() => [...this.claims()].sort((a,b) => b.id - a.id));

  // --- METHODS ---
  
  constructor() {
    effect(() => {
        // Mock AI Classifier Agent when description changes
        const desc = this.newExpenseDescription();
        if (desc.length > 5) {
            this.newExpenseAiSuggestion.set('');
            setTimeout(() => {
                if (desc.toLowerCase().includes('client') || desc.toLowerCase().includes('dinner')) {
                    this.newExpenseAiSuggestion.set('AI Suggestion: "Client Entertainment"');
                } else if (desc.toLowerCase().includes('flight') || desc.toLowerCase().includes('hotel') || desc.toLowerCase().includes('train')) {
                    this.newExpenseAiSuggestion.set('AI Suggestion: "Travel"');
                } else {
                    this.newExpenseAiSuggestion.set('');
                }
            }, 1000);
        }
    });
  }

  handleLogin() {
    this.loginError.set('');
    const user = this.users().find(u => u.id === this.loginId() && u.password === this.loginPassword());
    if (user) {
      this.loggedInUser.set(user);
      this.currentView.set(user.role === 'admin' ? 'admin' : 'employee');
    } else {
      this.loginError.set('Invalid credentials. Please try again.');
    }
  }

  logout() {
    this.loggedInUser.set(null);
    this.loginId.set('');
    this.loginPassword.set('');
    this.currentView.set('login');
  }

  handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newExpenseBill.set(input.files[0]);
      this.newExpenseFileName.set(input.files[0].name);
    }
  }

  // Mock AI Policy Enforcement Agent
  runPolicyCheck(): string[] {
    const user = this.loggedInUser();
    const amount = this.newExpenseAmount();
    const categoryId = this.newExpenseCategory();
    if (!user || amount === null || categoryId === null) return ['Missing form data.'];

    const violations: string[] = [];
    const category = this.categories().find(c => c.id === categoryId);

    // Rule: Quarterly Cap
    if (amount + this.availedAmount() > user.quarterlyCap) {
      violations.push(`Exceeds quarterly cap of ₹${user.quarterlyCap.toLocaleString()}.`);
    }

    // Rule: Category Limit
    if (category && amount > category.limit) {
      violations.push(`Exceeds category limit for "${category.name}" of ₹${category.limit.toLocaleString()}.`);
    }

    // Rule: Client Expense Eligibility
    if (category && category.isClientExpense && user.grade < 4) {
      violations.push(`Your grade (${user.grade}) is not eligible for client-related expenses.`);
    }

    return violations;
  }

  async submitExpense() {
    this.newExpensePolicyViolations.set([]);
    const violations = this.runPolicyCheck();
    if (violations.length > 0) {
      this.newExpensePolicyViolations.set(violations);
      return;
    }

    this.newExpenseSubmitting.set(true);
    // Simulate AI processing and submission
    await new Promise(resolve => setTimeout(resolve, 1500));

    const user = this.loggedInUser();
    if (user) {
      const newClaim: Claim = {
        id: this.claims().length + 1,
        employeeId: user.id,
        description: this.newExpenseDescription(),
        amount: this.newExpenseAmount() || 0,
        date: this.newExpenseDate(),
        categoryId: this.newExpenseCategory()!,
        status: 'Pending',
        billUrl: this.newExpenseFileName() ? `/uploads/${this.newExpenseFileName()}` : undefined,
        // Mock Anomaly Detection Agent
        riskScore: Math.floor(Math.random() * 70) + 5,
        policyViolations: []
      };
      this.claims.update(claims => [...claims, newClaim]);
      this.resetExpenseForm();
    }
    this.newExpenseSubmitting.set(false);
  }

  resetExpenseForm() {
    this.newExpenseDescription.set('');
    this.newExpenseAmount.set(null);
    this.newExpenseDate.set(new Date().toISOString().split('T')[0]);
    this.newExpenseCategory.set(null);
    this.newExpenseBill.set(null);
    this.newExpenseFileName.set('');
    this.newExpenseAiSuggestion.set('');
    this.newExpensePolicyViolations.set([]);
  }

  getCategoryName(id: number): string {
    return this.categories().find(c => c.id === id)?.name || 'Unknown';
  }

  getUserName(id: string): string {
    return this.users().find(u => u.id === id)?.name || 'Unknown';
  }

  updateClaimStatus(claimId: number, status: 'Approved' | 'Declined') {
    this.claims.update(claims => 
      claims.map(claim => 
        claim.id === claimId ? { ...claim, status } : claim
      )
    );
  }
}
