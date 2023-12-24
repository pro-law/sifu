export type Document = {
  /** @example 61/2020/QH14 */
  id: string
  /** @example Luật Đầu tư 2020 */
  title: string
  /** @example Luật */
  legislationType: string
  /** @example Doanh nghiệp, Đầu tư, Bộ máy hành chính */
  categories: string[]
  /** @example Quốc hội */
  organization: string
  issuedDate: string
  effectiveDate: string
  signers: string[]
  gazetteNumber: string
  gazetteDate: string
  /** @example Còn hiệu lực */
  status: string
  notes: string
  htmlContent: string
  htmlContentEn: string
  mdContent: string
  mdContentEn: string

  /** Văn bản được hướng dẫn */
  guidedDocuments: RelatedDocument[]
  /** Văn bản được hợp nhất */
  consolidatingDocuments: RelatedDocument[]
  /** Văn bản được sửa đổi bổ sung */
  amendedDocuments: RelatedDocument[]
  /** Văn bản bị thay thế */
  supersededDocuments: RelatedDocument[]
  /** Văn bản bị đính chính */
  rectifiedDocuments: RelatedDocument[]
  /** Văn bản được dẫn chiếu */
  referredDocuments: RelatedDocument[]
  /** Văn bản được căn cứ */
  influentialDocuments: RelatedDocument[]
  /** Văn bản hướng dẫn */
  guidingDocuments: RelatedDocument[]
  /** Văn bản hợp nhất */
  consolidatedDocuments: RelatedDocument[]
  /** Văn bản sửa đổi bổ sung */
  amendingDocuments: RelatedDocument[]
  /** Văn bản đính chính */
  rectifyingDocuments: RelatedDocument[]
  /** Văn bản thay thế */
  supersedingDocuments: RelatedDocument[]
  /** Văn bản liên quan cùng nội dung */
  relevantDocuments: RelatedDocument[]
}

type RelatedDocument = {
  /** @example 61/2020/QH14 */
  id: string
  /** @example Luật Đầu tư 2020 */
  title: string
  /** @example Luật */
  legislationType: string
  /** @example Doanh nghiệp, Đầu tư, Bộ máy hành chính */
  categories: string[]
  /** @example Quốc hội */
  organization: string
  issuedDate: string
  effectiveDate: string
  signers: string[]
  gazetteNumber: string
  gazetteDate: string
  /** @example Còn hiệu lực */
  status: string
}
