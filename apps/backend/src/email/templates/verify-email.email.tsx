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

interface VerifyEmailProps {
  verifyUrl: string;
}

export function VerifyEmail({ verifyUrl }: VerifyEmailProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>Confirm your email address</Preview>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold text-zinc-900">Confirm your email</Heading>
            <Text className="text-[15px] leading-6 text-zinc-700">
              Please confirm your email address to activate your account.
            </Text>
            <Section className="my-6">
              <Button
                className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white no-underline"
                href={verifyUrl}
              >
                Verify email
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

export default VerifyEmail;
