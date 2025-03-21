import { api } from '@/trpc/react'
import { useRegisterActions } from 'kbar'
import React from 'react'
import { useLocalStorage } from 'usehooks-ts'

const UseAccountSwitching = () => {
  
    const {data:accounts} = api.account.getAccounts.useQuery()

    const mainAction =[{
        id: "accountsAction",
        name: "Switch Account",
        shortcut: ['e','s'],
        section: "Accounts",
    }]

    const [_,accountId] = useLocalStorage('accountId','')

    React.useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.metaKey && /^[1-9]$/.test(event.key)) {
                event.preventDefault();
                const index = parseInt(event.key) - 1; // Convert key to index (0-based)
                if (accounts && accounts.length > index) {
                    accountId(accounts[index]!.id); // Switch to the corresponding account
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => {
            window.removeEventListener('keydown', handler);
        };
    }, [accounts, accountId]);

    useRegisterActions(mainAction.concat((accounts?.map((account, index) => {
        return {
            id: account.id,
            name: account.name,
            parent: 'accountsAction',
            perform: () => {
                console.log('perform', account.id)
                accountId(account.id)
            },
            keywords: [
                account.name,
                account.emailAddress,
            ].filter(Boolean) as string[],
            shortcut: [],
            section: "Accounts",
            subtitle: account.emailAddress,
            priority: 1000
        }
    })) || []), [accounts])

}

export default UseAccountSwitching