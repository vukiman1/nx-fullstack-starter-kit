import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface WelcomeEmailProps {
  email: string;
  appUrl: string;
}

export function WelcomeEmail({ email, appUrl }: WelcomeEmailProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>Your account is ready</Preview>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold text-zinc-900">Welcome aboard 🎉</Heading>
            <Text className="text-[15px] leading-6 text-zinc-700">
              Your account <strong>{email}</strong> has been created successfully.
            </Text>
            <Section className="my-6">
              <Button
                className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white no-underline"
                href={appUrl}
              >
                Go to dashboard
              </Button>
            </Section>
            <Text className="text-[13px] leading-5 text-zinc-400">
              If you didn&apos;t create this account, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default WelcomeEmail;
