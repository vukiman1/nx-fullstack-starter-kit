import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

interface VerificationCodeEmailProps {
  heading: string;
  intro: string;
  code: string;
  expiryMinutes: number;
}

export function VerificationCodeEmail({
  heading,
  intro,
  code,
  expiryMinutes,
}: VerificationCodeEmailProps) {
  return (
    <Tailwind>
      <Html lang="en">
        <Head />
        <Preview>{`${code} — ${heading}`}</Preview>
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto max-w-[480px] rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold text-zinc-900">{heading}</Heading>
            <Text className="text-[15px] leading-6 text-zinc-700">{intro}</Text>
            <Section className="my-6 rounded-md bg-zinc-100 py-5 text-center">
              <Text className="m-0 font-mono text-[32px] font-bold tracking-[8px] text-zinc-900">
                {code}
              </Text>
            </Section>
            <Text className="text-[13px] leading-5 text-zinc-400">
              The code expires in {expiryMinutes} minutes. If you didn&apos;t ask for it, ignore
              this email — nobody can use it without your inbox.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}

export default VerificationCodeEmail;
