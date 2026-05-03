import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 px-6 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-extrabold uppercase text-primary">
            Account access
          </p>
          <CardTitle className="text-3xl">
            <h1 id="register-title">Register</h1>
          </CardTitle>
          <CardDescription>Create account flow will live here.</CardDescription>
        </CardHeader>

        <CardContent>
          <Button asChild variant="outline">
            <Link to="/login">Back to login</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
