"use client";

const reassurances = [
    {
        img: "https://www.coursesu.com/on/demandware.static/-/Sites-DigitalU-Library/default/dwcb24c937/pictos/Footer_Reassurance_Proximite.svg",
        text: "Un large choix de produits en ligne comme en magasin.",
        link: "https://www.coursesu.com/nos-engagements.html",
    },
    {
        img: "https://www.coursesu.com/on/demandware.static/-/Sites-DigitalU-Library/default/dwa9553dbd/pictos/Footer_Reassurance_Produits.svg",
        text: "Nos équipes font vos courses comme vous.",
        link: "https://www.coursesu.com/nos-engagements.html",
    },
    {
        img: "https://www.coursesu.com/on/demandware.static/-/Sites-DigitalU-Library/default/dw97899079/pictos/Footer_Reassurance_CarteU.svg",
        text: "Utilisez votre Carte U pour gagner des euros.",
        link: "https://www.coursesu.com/nos-engagements.html",
    },
    {
        img: "https://www.coursesu.com/on/demandware.static/-/Sites-DigitalU-Library/default/dw657b1dd2/pictos/Footer_Reassurance_Expiration.svg",
        text: "Les dates limites de consommations sont choisies attentivement.",
        link: "https://www.coursesu.com/nos-engagements.html",
    },
];

export default function ReassuranceSection() {
    return (
        <div className="w-full mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-[#007d8f] py-6 px-6 text-white">
                {reassurances.map((item, index) => (
                    <a
                        key={index}
                        href="/legal/maintenance"
                        className="flex items-center gap-4 text-center sm:text-left"
                    >
                        <img
                            src={item.img}
                            alt=""
                            width="60"
                            height="60"
                            className="w-14 h-14"
                        />
                        <p className="text-sm font-medium">{item.text}</p>
                    </a>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white">
                <div>
                    <h2 className="text-lg font-bold">Suivez-nous</h2>
                    <ul className="flex gap-4 mt-2">
                        <li>
                            <a
                                className="footer-icon icon-facebook hover:opacity-80"
                                rel="noopener"
                                href="https://fr-fr.facebook.com/La.Marque.U/"
                                target="_blank"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="37"
                                    height="37"
                                    viewBox="0 0 37 37"
                                    fill="none"
                                >
                                    <rect width="37" height="37" rx="18.5" fill="#007D8F"></rect>
                                    <path
                                        d="M16.1875 15.4167H13.875V18.5H16.1875V27.75H20.0417V18.5H22.849L23.125 15.4167H20.0417V14.1317C20.0417 13.3955 20.1897 13.1042 20.9011 13.1042H23.125V9.25H20.1897C17.4178 9.25 16.1875 10.4702 16.1875 12.8074V15.4167Z"
                                        fill="white"
                                    ></path>
                                </svg>
                            </a>
                        </li>
                        <li>
                            <a
                                className="footer-icon icon-instagram hover:opacity-80"
                                rel="noopener"
                                href="https://www.instagram.com/ulescommercants/?hl=fr"
                                target="_blank"
                                aria-label="Instagram Nouvelle fenêtre"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="37"
                                    height="37"
                                    viewBox="0 0 37 37"
                                    fill="none"
                                >
                                    <rect width="37" height="37" rx="18.5" fill="#007D8F"></rect>
                                    <path
                                        d="M18.5 10.9173C20.9697 10.9173 21.2627 10.9266 22.2385 10.9713C24.7453 11.0854 25.9162 12.2747 26.0303 14.763C26.075 15.7381 26.0835 16.031 26.0835 18.5008C26.0835 20.9713 26.0742 21.2634 26.0303 22.2385C25.9154 24.7245 24.7476 25.9162 22.2385 26.0303C21.2627 26.075 20.9713 26.0842 18.5 26.0842C16.0302 26.0842 15.7373 26.075 14.7622 26.0303C12.2493 25.9154 11.0846 24.7206 10.9705 22.2378C10.9258 21.2627 10.9165 20.9705 10.9165 18.5C10.9165 16.0302 10.9266 15.7381 10.9705 14.7622C11.0854 12.2747 12.2532 11.0846 14.7622 10.9705C15.7381 10.9266 16.0302 10.9173 18.5 10.9173ZM18.5 9.25C15.9879 9.25 15.6734 9.26079 14.6867 9.3055C11.3274 9.45967 9.46044 11.3235 9.30627 14.6859C9.26079 15.6734 9.25 15.9879 9.25 18.5C9.25 21.0121 9.26079 21.3274 9.3055 22.3141C9.45967 25.6734 11.3235 27.5403 14.6859 27.6945C15.6734 27.7392 15.9879 27.75 18.5 27.75C21.0121 27.75 21.3274 27.7392 22.3141 27.6945C25.6703 27.5403 27.5419 25.6765 27.6937 22.3141C27.7392 21.3274 27.75 21.0121 27.75 18.5C27.75 15.9879 27.7392 15.6734 27.6945 14.6867C27.5434 11.3305 25.6772 9.46044 22.3149 9.30627C21.3274 9.26079 21.0121 9.25 18.5 9.25V9.25ZM18.5 13.7501C15.8769 13.7501 13.7501 15.8769 13.7501 18.5C13.7501 21.1231 15.8769 23.2506 18.5 23.2506C21.1231 23.2506 23.2499 21.1239 23.2499 18.5C23.2499 15.8769 21.1231 13.7501 18.5 13.7501ZM18.5 21.5833C16.7972 21.5833 15.4167 20.2035 15.4167 18.5C15.4167 16.7972 16.7972 15.4167 18.5 15.4167C20.2028 15.4167 21.5833 16.7972 21.5833 18.5C21.5833 20.2035 20.2028 21.5833 18.5 21.5833ZM23.438 12.4528C22.8244 12.4528 22.3272 12.95 22.3272 13.5628C22.3272 14.1756 22.8244 14.6728 23.438 14.6728C24.0508 14.6728 24.5472 14.1756 24.5472 13.5628C24.5472 12.95 24.0508 12.4528 23.438 12.4528Z" fill="white"></path>
                                </svg>
                            </a>
                        </li>
                        <li>
                            <a className="footer-icon icon-twitter hover:opacity-80" rel="noopener" href="https://x.com/cooperativeu" target="_blank">
                                <svg width="37" height="37" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="32" height="32" rx="16" fill="#007D8F"></rect>
                                    <path d="M17.5222 14.7749L23.4785 8H22.0671L16.8952 13.8826L12.7644 8H8L14.2466 16.8955L8 24H9.41155L14.8732 17.7878L19.2356 24H24L17.5218 14.7749H17.5222ZM15.5889 16.9738L14.956 16.0881L9.92015 9.03974H12.0882L16.1522 14.728L16.7851 15.6137L22.0677 23.0075H19.8997L15.5889 16.9742V16.9738Z" fill="white"></path>
                                </svg>
                            </a>
                        </li>
                        <li>
                            <a className="footer-icon icon-youtube hover:opacity-80" rel="noopener" href="https://www.youtube.com/channel/UC64Dt3bVFWVxKnd4pafs1aA" target="_blank">
                                <svg xmlns="http://www.w3.org/2000/svg" width="37" height="37" viewBox="0 0 37 37" fill="none">
                                    <rect width="37" height="37" rx="18.5" fill="#007D8F"></rect>
                                    <path d="M24.3699 11.7044C21.5918 11.5148 15.4043 11.5156 12.6301 11.7044C9.62617 11.9095 9.27235 13.724 9.25 18.5001C9.27235 23.2677 9.62308 25.09 12.6301 25.2958C15.4051 25.4846 21.5918 25.4854 24.3699 25.2958C27.3738 25.0907 27.7276 23.2762 27.75 18.5001C27.7276 13.7325 27.3769 11.9102 24.3699 11.7044ZM16.1875 21.5834V15.4168L22.3542 18.4947L16.1875 21.5834Z" fill="white"></path>
                                </svg>
                            </a>
                        </li>
                    </ul>
                </div>
                <div>
                    <h2 className="text-lg font-bold">Inscrivez-vous à la Newsletter</h2>
                    <p className="text-sm mt-2">Recevez les meilleures offres de votre magasin U</p>
                    <a
                        href="/legal/maintenance"
                        className="inline-block bg-[#007d8f] text-white font-medium px-6 py-3 rounded mt-4"
                    >
                        Inscription à la newsletter
                    </a>
                </div>
                <div>
                    <h2 className="text-lg font-bold">Les consommateurs nous ont octroyé</h2>
                    <p className="mt-2 text-gray-800">
                        <span className="text-xl font-bold">3,9</span> / 5 sur
                        <span className="font-bold"> 25 489 avis</span>.
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Service pratique mais souvent des ruptures sur les produits en promotion.</p>
                </div>
            </div>
        </div>
    );
}
