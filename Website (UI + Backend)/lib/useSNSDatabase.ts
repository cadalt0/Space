import { useState, useEffect } from 'react'
import axios from 'axios'
import { buildSnsUrl, buildHealthUrl } from './sns-config'

interface SNSUser {
  email: string
  sns_id: string
}

interface SNSResponse {
  user?: SNSUser
}

export function useSNSDatabase(userEmail?: string) {
  const [existingSNS, setExistingSNS] = useState<SNSUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const checkExistingSNS = async (email: string) => {
    if (!email) return

    setIsLoading(true)
    setError(null)

    try {
      const url = buildSnsUrl(encodeURIComponent(email))
      const response = await axios.get(url)
      const data: SNSResponse = response.data

      if (data.user) {
        setExistingSNS(data.user)
      } else {
        setExistingSNS(null)
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setExistingSNS(null)
      } else {
        setError('Failed to check existing SNS ID')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const saveSNSID = async (email: string, snsId: string) => {
    try {
      const response = await axios.post(buildSnsUrl(), {
        email,
        sns_id: snsId
      })
      if (response.status === 200 || response.status === 201) {
        await checkExistingSNS(email)
      }
    } catch (error) {
      setError('Failed to save SNS ID')
    }
  }

  useEffect(() => {
    if (userEmail) {
      checkExistingSNS(userEmail)
    }
  }, [userEmail])

  return { existingSNS, isLoading, error, checkExistingSNS, saveSNSID }
}

export function hasSNSProfile(existingSNS: SNSUser | null): boolean {
  return !!(existingSNS && existingSNS.sns_id)
}
