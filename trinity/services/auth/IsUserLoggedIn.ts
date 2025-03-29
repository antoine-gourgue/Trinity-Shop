import { auth } from '@/auth'

export async function isUserLoggedIn(){
    const session = await auth()
    return !!session
}