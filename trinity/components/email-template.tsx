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

const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : '';
interface WelcomeEmailProps {
    firstName: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({ firstName }) => {
    return (
        <Html>
            <Head />
            <Preview>Votre nouveau Trinity est prêt</Preview>
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
                        <Text className="text-darkGray text-center mb-20">
                            La création de votre nouveau trinity est finalisée !
                        </Text>
                        <Text className="text-darkGray mb-20">
                            En vous connectant à ce compte grâce à votre adresse e-mail (votre identifiant) et votre mot de passe, vous pouvez accéder :
                        </Text>
                        <ul className="list-disc pl-30 mb-20">
                            <li>
                                aux sites <Link href="https://trinity.pioupiou.tech/" className="text-brandBlue underline">trinity.pioupiou.tech</Link>
                            </li>
                        </ul>
                        <Text className="text-darkGray mb-20">
                            Depuis <strong>votre Espace Client unique</strong>, vous pouvez, simplement et en toute sécurité, modifier vos informations personnelles.
                        </Text>
                        <Section className="text-center my-20">
                            <Button className="bg-brandBlue text-white py-3 px-8 rounded-lg shadow-md">
                                Accéder à mon Espace Client
                            </Button>
                        </Section>
                        <Text className="text-darkGray text-center mt-20">
                            À bientôt sur votre Espace Client !
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

export default WelcomeEmail;