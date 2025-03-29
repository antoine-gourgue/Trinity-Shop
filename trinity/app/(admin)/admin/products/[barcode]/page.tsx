'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

interface OpenFoodFactsResponse {
    status: number
    status_verbose: string
    code: string
    product: ProductData | null
}

interface ProductData {
    product_name: string
    generic_name: string
    brands: string
    quantity: string
    categories: string
    labels: string
    ingredients_text: string
    allergens_imported: string
    additives_tags: string[]
    packaging: string
    countries: string
    stores: string
    image_front_url: string
    image_ingredients_url: string
    image_nutrition_url: string
    nutriments: Nutriments
    carbon_footprint_percent_of_known_ingredients?: number
    nutriscore_grade?: string
}

interface Nutriments {
    energy?: number
    energy_kcal?: number
    carbohydrates?: number
    proteins?: number
    fat?: number
    salt?: number
    sugars?: number
    fiber?: number
}

const formatNutrient = (value?: number) => {
    if (value === undefined || isNaN(value)) return 'Non renseigné';
    return value.toFixed(2);
};

const ProductPage = ({ params }: { params: Promise<{ barcode: string }> }) => {
    const { barcode } = use(params);
    const router = useRouter();

    const [product, setProduct] = useState<ProductData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
                if (!res.ok) throw new Error('Erreur lors de la récupération des données');

                const data: OpenFoodFactsResponse = await res.json();

                if (data.status !== 1 || !data.product) {
                    setError(true);
                } else {
                    setProduct(data.product);
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [barcode]);

    if (loading) {
        return (
            <div className="container mx-auto p-6 flex flex-col items-center">
                <Skeleton className="w-full h-32" />
                <Skeleton className="w-full h-64 mt-4" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto p-6 flex flex-col items-center">
                <p className="text-red-500">Produit non trouvé.</p>
                <Button variant="outline" onClick={() => router.back()} className="mt-4">
                    Retour
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                Retour
            </Button>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold">
                        {product?.product_name || product?.generic_name}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="flex justify-center">
                        {product?.image_front_url ? (
                            <Image
                                src={product.image_front_url}
                                alt={product.product_name}
                                width={300}
                                height={300}
                                className="rounded-lg object-contain w-[300px] h-[300px]"
                                priority
                            />
                        ) : (
                            <Skeleton className="w-[300px] h-[300px] rounded-lg" />
                        )}
                    </div>

                    <div className="space-y-2">
                        <p><strong>Marque :</strong> {product?.brands}</p>
                        <p><strong>Quantité :</strong> {product?.quantity}</p>
                        <p><strong>Catégories :</strong> {product?.categories}</p>
                        <p><strong>Labels :</strong> {product?.labels || 'Aucun'}</p>
                        <p><strong>Ingrédients :</strong> {product?.ingredients_text || 'Non renseigné'}</p>
                        <p><strong>Allergènes :</strong> {product?.allergens_imported || 'Non renseigné'}</p>
                        <p><strong>Empreinte carbone :</strong> {product?.carbon_footprint_percent_of_known_ingredients ? `${product.carbon_footprint_percent_of_known_ingredients}%` : 'Non renseigné'}</p>

                        <div className="flex items-center space-x-2">
                            <strong>Nutri-Score :</strong>
                            {product?.nutriscore_grade ? (
                                <Badge>{product.nutriscore_grade.toUpperCase()}</Badge>
                            ) : (
                                <span>Non renseigné</span>
                            )}
                        </div>

                        <p><strong>Type d'emballage :</strong> {product?.packaging || 'Non renseigné'}</p>
                        <p><strong>Pays de distribution :</strong> {product?.countries || 'Non renseigné'}</p>
                        <p><strong>Magasins :</strong> {product?.stores || 'Non renseigné'}</p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
                {product?.image_ingredients_url && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Ingrédients</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image
                                src={product.image_ingredients_url}
                                alt="Ingrédients"
                                width={300}
                                height={300}
                                className="rounded-lg"
                            />
                        </CardContent>
                    </Card>
                )}

                {product?.image_nutrition_url && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Informations Nutritionnelles</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image
                                src={product.image_nutrition_url}
                                alt="Informations nutritionnelles"
                                width={300}
                                height={300}
                                className="rounded-lg"
                            />
                        </CardContent>
                    </Card>
                )}
            </div>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Valeurs Nutritionnelles (pour 100g)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        <li className="flex justify-between items-center"><span>Énergie :</span><Badge>{formatNutrient(product?.nutriments.energy)} kJ ({formatNutrient(product?.nutriments.energy_kcal)} kcal)</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Glucides :</span><Badge>{formatNutrient(product?.nutriments.carbohydrates)} g</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Protéines :</span><Badge>{formatNutrient(product?.nutriments.proteins)} g</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Fibres :</span><Badge>{formatNutrient(product?.nutriments.fiber)} g</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Lipides :</span><Badge>{formatNutrient(product?.nutriments.fat)} g</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Sucres :</span><Badge>{formatNutrient(product?.nutriments.sugars)} g</Badge></li>
                        <Separator />
                        <li className="flex justify-between items-center"><span>Sel :</span><Badge>{formatNutrient(product?.nutriments.salt)} g</Badge></li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default ProductPage;
