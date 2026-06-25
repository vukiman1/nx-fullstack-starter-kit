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

interface ResetPasswordEmailProps {
  resetUrl: string;
}

export function ResetPasswordEmail({ resetUrl }: ResetPasswordEmailProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>Reset your password</Preview>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold text-zinc-900">Reset your password</Heading>
            <Text className="text-[15px] leading-6 text-zinc-700">
              We received a request to reset your password. This link expires shortly.
            </Text>
            <Section className="my-6">
              <Button
                className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white no-underline"
                href={resetUrl}
              >
                Reset password
              </Button>
            </Section>
            <Text className="text-[13px] leading-5 text-zinc-400">
              If you didn&apos;t request this, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default ResetPasswordEmail;
