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

interface TwoFactorRecoveryEmailProps {
  recoveryUrl: string;
}

export function TwoFactorRecoveryEmail({ recoveryUrl }: TwoFactorRecoveryEmailProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>Turn off two-factor authentication</Preview>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold text-zinc-900">
              Regain access to your account
            </Heading>
            <Text className="text-[15px] leading-6 text-zinc-700">
              Someone asked to turn off two-factor authentication because they could not use their
              authenticator app. Following this link switches it off and signs out every device, so
              you will need to sign in again with your password.
            </Text>
            <Section className="my-6">
              <Button
                className="rounded-md bg-zinc-900 px-5 py-3 text-sm font-semibold text-white no-underline"
                href={recoveryUrl}
              >
                Turn off two-factor authentication
              </Button>
            </Section>
            <Text className="text-[13px] leading-5 text-zinc-400">
              This link expires shortly. If this wasn&apos;t you, ignore this email — your settings
              stay as they are, but consider changing your password.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default TwoFactorRecoveryEmail;
