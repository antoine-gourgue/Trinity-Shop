import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Link,
    Preview,
    Section,
    Tailwind,
    Text,
} from '@react-email/components';
import type * as React from 'react';

interface PasswordResetEmailProps {
    firstName: string;
    resetUrl: string;
}

// E-mail « mot de passe oublié » : lien vers /auth/reinitialiser, valable 1 heure
export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({ firstName, resetUrl }) => {
    return (
        <Html>
            <Head />
            <Preview>Choisissez un nouveau mot de passe Trinity</Preview>
            <Tailwind
                config={{
                    theme: {
                        extend: {
                            colors: {
                                brandBlue: '#007dc5',
                                brandYellow: '#ffd700',
                                lightGray: '#f4f4f4',
                                darkGray: '#555555',
                            },
                            spacing: {
                                0: '0px',
                                10: '10px',
                                20: '20px',
                                30: '30px',
                            },
                        },
                    },
                }}
            >
                <Body className="bg-lightGray text-base font-sans">
                    <Container className="bg-white mx-auto p-20 shadow-md rounded-lg">
                        <Heading className="text-center text-brandBlue mb-10">
                            Bonjour, {firstName} !
                        </Heading>
                        <Text className="text-darkGray mb-20">
                            Vous avez demandé à réinitialiser le mot de passe de votre compte Trinity.
                            Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
                        </Text>
                        <Section className="text-center my-20">
                            <Button href={resetUrl} className="bg-brandBlue text-white py-3 px-8 rounded-lg shadow-md">
                                Choisir un nouveau mot de passe
                            </Button>
                        </Section>
                        <Text className="text-darkGray mb-20">
                            Ce lien est valable <strong>1 heure</strong> et ne peut servir qu’une seule fois.
                            Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :
                        </Text>
                        <Text className="text-darkGray mb-20 break-all">
                            <Link href={resetUrl} className="text-brandBlue underline">
                                {resetUrl}
                            </Link>
                        </Text>
                        <Text className="text-darkGray mb-20">
                            Vous n’êtes pas à l’origine de cette demande ? Ignorez simplement cet e-mail :
                            votre mot de passe reste inchangé.
                        </Text>
                        <Text className="text-darkGray text-center">
                            Votre magasin en ligne <strong>Trinity</strong>
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default PasswordResetEmail;
